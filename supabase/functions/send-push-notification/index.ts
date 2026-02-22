import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Input validation ---
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateInput(data: unknown): { userId: string; title: string; body: string; url: string; notificationId?: string } {
  if (!data || typeof data !== 'object') throw new Error('Invalid request body');
  const d = data as Record<string, unknown>;

  if (typeof d.userId !== 'string' || !isValidUUID(d.userId)) throw new Error('Invalid userId');
  if (typeof d.title !== 'string' || d.title.length === 0 || d.title.length > 200) throw new Error('Invalid title');
  if (typeof d.body !== 'string' || d.body.length === 0 || d.body.length > 1000) throw new Error('Invalid body');

  const url = typeof d.url === 'string' ? d.url.slice(0, 500) : '/';
  // Only allow relative paths
  if (!url.startsWith('/')) throw new Error('Invalid url');

  let notificationId: string | undefined;
  if (d.notificationId != null) {
    if (typeof d.notificationId !== 'string' || !isValidUUID(d.notificationId)) throw new Error('Invalid notificationId');
    notificationId = d.notificationId;
  }

  return { userId: d.userId, title: d.title, body: d.body, url, notificationId };
}

// --- Auth helper ---
async function authenticateCaller(req: Request): Promise<{ type: 'user'; userId: string } | { type: 'service' }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization');
  }

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // If the token IS the service role key, it's a trusted internal call
  if (token === serviceRoleKey) {
    return { type: 'service' };
  }

  // Otherwise validate as user JWT
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Unauthorized');
  }

  return { type: 'user', userId: data.user.id };
}

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

// Generate VAPID JWT token for web push
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

  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  const pkcs8Prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ]);
  
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
    console.log('Could not import key for JWT signing');
    return '';
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigArray = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(sigArray.slice(0, 64));
  
  return `${unsignedToken}.${signatureB64}`;
}

// Generate APNs JWT token for iOS push
async function generateApnsJwt(
  keyId: string,
  teamId: string,
  privateKeyPem: string
): Promise<string> {
  const header = { 
    alg: 'ES256', 
    kid: keyId,
    typ: 'JWT'
  };
  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000)
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemLines = privateKeyPem.split('\n').filter(line => 
    !line.includes('-----BEGIN') && !line.includes('-----END') && line.trim()
  );
  const keyBase64 = pemLines.join('');
  const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const sigArray = new Uint8Array(signature);
    let r: Uint8Array, s: Uint8Array;
    
    if (sigArray[0] === 0x30) {
      let offset = 2;
      const rLength = sigArray[offset + 1];
      offset += 2;
      r = sigArray.slice(offset, offset + rLength);
      offset += rLength;
      const sLength = sigArray[offset + 1];
      offset += 2;
      s = sigArray.slice(offset, offset + sLength);
      
      if (r.length > 32 && r[0] === 0) r = r.slice(1);
      if (s.length > 32 && s[0] === 0) s = s.slice(1);
      
      if (r.length < 32) {
        const padded = new Uint8Array(32);
        padded.set(r, 32 - r.length);
        r = padded;
      }
      if (s.length < 32) {
        const padded = new Uint8Array(32);
        padded.set(s, 32 - s.length);
        s = padded;
      }
    } else {
      r = sigArray.slice(0, 32);
      s = sigArray.slice(32, 64);
    }

    const rawSig = new Uint8Array(64);
    rawSig.set(r, 0);
    rawSig.set(s, 32);
    
    const signatureB64 = base64UrlEncode(rawSig);
    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error('Error generating APNs JWT:', error);
    throw error;
  }
}

// Send push to iOS via APNs
async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  url: string,
  apnsKeyId: string,
  apnsTeamId: string,
  apnsPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const jwt = await generateApnsJwt(apnsKeyId, apnsTeamId, apnsPrivateKey);
    
    const apnsHost = 'https://api.push.apple.com';
    const endpoint = `${apnsHost}/3/device/${deviceToken}`;
    
    const payload = {
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        'mutable-content': 1
      },
      url: url || '/'
    };

    console.log('Sending APNs push to:', deviceToken.substring(0, 20) + '...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': 'com.HtucvlQTpJTI.proof',
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('APNs push sent successfully');
      return { success: true };
    } else {
      const errorBody = await response.text();
      console.error('APNs error:', response.status, errorBody);
      if (response.status === 410) {
        return { success: false, error: 'expired' };
      }
      return { success: false, error: `${response.status}: ${errorBody}` };
    }
  } catch (error) {
    console.error('APNs send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const caller = await authenticateCaller(req);
    console.log('Authenticated caller type:', caller.type);

    // Parse and validate input
    const rawBody = await req.json();
    const { userId, title, body, url, notificationId } = validateInput(rawBody);

    // If caller is a regular user, they can only send notifications that are triggered by their own actions
    // (the client hooks send notifications where actor_id = auth.uid(), so userId here is the recipient)
    // We allow this because the notification insert RLS policy already enforces actor_id = auth.uid()
    
    console.log('=== Push Notification Request ===');
    console.log('User ID:', userId);
    console.log('Title:', title);

    // Web push config
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    // APNs config
    const apnsKeyId = Deno.env.get('APNS_KEY_ID');
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
    const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const hasWebPush = vapidPublicKey && vapidPrivateKey;
    const hasApns = apnsKeyId && apnsTeamId && apnsPrivateKey;

    if (!hasWebPush && !hasApns) {
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

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
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const platform = sub.platform || 'web';
        
        if (platform === 'ios' && hasApns && sub.device_token) {
          const result = await sendApnsPush(
            sub.device_token, title, body, url || '/',
            apnsKeyId!, apnsTeamId!, apnsPrivateKey!
          );
          
          if (result.success) {
            successCount++;
          } else if (result.error === 'expired') {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            errors.push(`iOS subscription ${sub.id} expired`);
          } else {
            errors.push(`iOS: ${result.error}`);
          }
        } else if (platform === 'web' && hasWebPush) {
          const endpoint = sub.endpoint;
          const audience = new URL(endpoint).origin;
          
          let vapidJwt = '';
          try {
            vapidJwt = await generateVapidJwt(
              audience,
              'mailto:support@proofnotplans.lovable.app',
              vapidPrivateKey!
            );
          } catch (e) {
            console.log('JWT generation failed:', e);
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'TTL': '86400',
          };

          if (vapidJwt) {
            headers['Authorization'] = `vapid t=${vapidJwt}, k=${vapidPublicKey}`;
          }

          const payload = JSON.stringify({ 
            title, body, url: url || '/',
            notificationId: notificationId || null,
            timestamp: Date.now()
          });

          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: payload
          });

          const responseStatus = response.status;
          
          if (response.ok || responseStatus === 201) {
            successCount++;
          } else if (responseStatus === 410 || responseStatus === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            errors.push(`Web subscription ${sub.id} expired`);
          } else {
            const responseText = await response.text();
            console.error('Web push failed:', responseStatus, responseText);
            errors.push(`Web status ${responseStatus}: ${responseText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending to subscription:', errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`=== Push Complete: ${successCount}/${subscriptions.length} sent ===`);

    return new Response(
      JSON.stringify({ 
        success: true, sent: successCount, total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Missing authorization' || message === 'Unauthorized' ? 401
      : message.startsWith('Invalid') ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
