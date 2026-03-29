import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { image, hint } = await request.json()
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    console.log('API Key exists:', !!process.env.GEMINI_API_KEY)

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: image,
                },
              },
              {
                text: 'You are analyzing a photo of an indoor climbing gym wall. Identify a single climbing route and return ONLY a valid JSON object with these exact fields — no markdown, no backticks, no extra text:\n- color: hold color name from this list only: pink, blue, green, yellow, red, purple, orange, white, black, gray, tan\n- grade: suggested V-grade based on hold size, density, and wall angle (e.g. "V3")\n- tags: array from this list only: crimpy, slopey, juggy, overhang, slab, pinchy, powerful, balancy\n- description: one sentence describing the climb\n- hex_base: hex string of the main/average color of the target holds (e.g. "#C03920")\n- hex_light: hex string of the hold color in bright or highlighted areas\n- hex_shadow: hex string of the hold color in shadowed or dark areas\n- tolerance: integer 40–100 for how much color variation exists on the holds — higher means more lighting variation\n- color_description: one sentence describing the hold color and lighting you observe' + (hint ? ` Focus specifically on the climb with these characteristics: ${hint}. Ignore all other climbs in the image.` : ''),
              },
            ],
          }],
        }),
      }
    )

    console.log('Gemini response status:', response.status)

    const rawText = await response.text()
    console.log('Gemini raw response:', rawText)

    if (!response.ok) {
      return NextResponse.json({ error: 'Gemini API error', detail: rawText, rawText }, { status: 502 })
    }

    const geminiData = JSON.parse(rawText)
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({ error: 'No content in Gemini response', rawText }, { status: 502 })
    }

    const parsed = JSON.parse(text.trim())
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
