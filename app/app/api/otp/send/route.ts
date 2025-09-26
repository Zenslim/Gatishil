import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

const AAKASH_API_KEY = process.env.AAKASH_SMS_API_KEY || '';
const AAKASH_FROM = process.env.AAKASH_SMS_FROM || 'GATISHIL';

function sixDigit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { phone }:{ phone:string } = await req.json();
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return NextResponse.json({ ok:false, error:'Invalid phone' }, { status: 400 });
    }

    const code = sixDigit();
    const supabase = getServerSupabase();
    const { error: ierr } = await supabase.from('otps').insert([{ phone, code }]);
    if (ierr) return NextResponse.json({ ok:false, error: ierr.message }, { status: 500 });

    // AakashSMS v4
    let sent = false, apiError: string | null = null;
    try {
      if (AAKASH_API_KEY) {
        const toLocal = phone.replace(/^\+977/, ''); // adjust if required by your account settings
        const message = `Your Gatishil verification code is ${code}. It expires in 5 minutes.`;

        const resp = await fetch('https://sms.aakashsms.com/sms/v3/send',{
          method:'POST',
          headers:{
            'Authorization': `Bearer ${AAKASH_API_KEY}`,
            'Content-Type':'application/json'
          },
          body: JSON.stringify({ to:[toLocal], message, from: AAKASH_FROM })
        });
        const data = await resp.json().catch(()=>({}));
        if (resp.ok) sent = true;
        else apiError = (data?.error || data?.message || `HTTP ${resp.status}`);
      } else {
        apiError = 'AAKASH_SMS_API_KEY not set';
      }
    } catch (e:any) {
      apiError = e?.message || 'send failed';
    }

    if (!sent) return NextResponse.json({ ok:true, warn: apiError || 'not sent' });
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server error' }, { status: 500 });
  }
}
