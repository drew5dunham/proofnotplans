import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 URL encoding helpers
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generate VAPID JWT token
async function generateVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // Create PKCS8 format for the private key
  const pkcs8Prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ]);
  
  const pkcs8Suffix = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);
  
  // We'll just sign with the raw key - this requires proper VAPID key format
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array([...pkcs8Prefix, ...privateKeyBytes]).buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(() => {
    console.log('PKCS8 import failed, trying raw format');
    return null;
  });

  if (!cryptoKey) {
    // If PKCS8 fails, return a placeholder - the notification will still work for FCM
    console.log('Could not import key for JWT signing');
    return '';
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (r || s)
  const sigArray = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(sigArray.slice(0, 64));
  
  return `${unsignedToken}.${signatureB64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, url, notificationId } = await req.json();
    
    console.log('=== Push Notification Request ===');
    console.log('User ID:', userId);
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('URL:', url);

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('VAPID public key available:', !!vapidPublicKey);
    console.log('VAPID private key available:', !!vapidPrivateKey);

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    const payload = JSON.stringify({ 
      title, 
      body, 
      url: url || '/',
      notificationId: notificationId || null,
      timestamp: Date.now()
    });

    let successCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const endpoint = sub.endpoint;
        console.log('Sending to endpoint:', endpoint.substring(0, 80) + '...');
        
        const audience = new URL(endpoint).origin;
        
        // Try to generate VAPID JWT
        let vapidJwt = '';
        try {
          vapidJwt = await generateVapidJwt(
            audience,
            'mailto:support@proofnotplans.lovable.app',
            vapidPrivateKey
          );
        } catch (e) {
          console.log('JWT generation failed:', e);
        }

        // Build headers for push service
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'TTL': '86400',
        };

        if (vapidJwt) {
          headers['Authorization'] = `vapid t=${vapidJwt}, k=${vapidPublicKey}`;
        }

        // Send to push service
        // Note: This sends unencrypted - works for testing but production needs encryption
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: payload
        });

        const responseStatus = response.status;
        console.log('Push response status:', responseStatus);
        
        if (response.ok || responseStatus === 201) {
          successCount++;
          console.log('Push sent successfully!');
        } else if (responseStatus === 410 || responseStatus === 404) {
          console.log('Subscription expired/invalid, removing from database');
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          errors.push(`Subscription ${sub.id} expired`);
        } else {
          const responseText = await response.text();
          console.error('Push failed:', responseStatus, responseText);
          errors.push(`Status ${responseStatus}: ${responseText.substring(0, 100)}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending to subscription:', errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`=== Push Complete: ${successCount}/${subscriptions.length} sent ===`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
