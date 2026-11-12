// import { NextResponse } from 'next/server';

// export async function POST() {
//     try {
//         const res = await fetch('https://api.liveavatar.com/v1/sessions/token', {
//             method: 'POST',
//             headers: {
//                 'X-API-KEY': process.env.LIVEAVATAR_API_KEY as string,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 mode: 'FULL',
//                 avatar_id: process.env.LIVEAVATAR_AVATAR_ID,
//                 is_sandbox: true,
//                 voice_agent: {
//                     id: process.env.LIVEAVATAR_VOICE_AGENT_ID,
//                 },
//             }),
//         });

//         const raw = await res.text();
//         console.log('LiveAvatar status:', res.status, raw.slice(0, 300));

//         let data;
//         try {
//             data = JSON.parse(raw);
//         } catch {
//             return NextResponse.json({ error: 'Non-JSON response from LiveAvatar' }, { status: 502 });
//         }


//         const session_token = data?.data?.session_token;
//         if (!res.ok || !session_token) {
//             return NextResponse.json({ error: 'Failed to create session token', details: data }, { status: 500 });
//         }

//         return NextResponse.json({ session_token });
//     } catch (error) {
//         console.error('Error fetching LiveAvatar token:', error);
//         return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
//     }
// }

import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const res = await fetch('https://api.liveavatar.com/v1/sessions/token', {
            method: 'POST',
            headers: {
                'X-API-KEY': process.env.LIVEAVATAR_API_KEY as string,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: 'FULL',
                avatar_id: process.env.LIVEAVATAR_AVATAR_ID,
                // Removed is_sandbox: true so the avatar is allowed to load
                avatar_persona: {
                    voice_id: process.env.LIVEAVATAR_VOICE_ID,
                    context_id: process.env.LIVEAVATAR_CONTEXT_ID,
                    language: 'en'
                },
            }),
        });

        const raw = await res.text();
        console.log('LiveAvatar status:', res.status, raw.slice(0, 300));

        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            return NextResponse.json({ error: 'Non-JSON response from LiveAvatar' }, { status: 502 });
        }

        const session_token = data?.data?.session_token;
        if (!res.ok || !session_token) {
            return NextResponse.json({ error: 'Failed to create session token', details: data }, { status: 500 });
        }

        return NextResponse.json({ session_token });
    } catch (error) {
        console.error('Error fetching LiveAvatar token:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}