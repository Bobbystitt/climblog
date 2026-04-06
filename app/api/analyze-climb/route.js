import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { image, climbImage, tagImage, hint } = await request.json()
    const mainImage = climbImage ?? image
    if (!mainImage) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    console.log('API Key exists:', !!process.env.GEMINI_API_KEY)

    const colorProfilingInstructions = ` For the hex color values, be very precise. Look carefully at the actual hold surfaces in the climb photo — not the wall texture, not chalk, not shadows between holds, but the actual painted or molded surface of the holds themselves. Sample the color from the brightest lit area of a hold for hex_light, the average lit area for hex_base, and the most shadowed area of a visible hold for hex_shadow. For tolerance: if the holds are a single solid color with minimal variation use 45, if there is moderate lighting variation across holds use 65, if there is heavy shadow variation or the holds have texture that changes their appearance significantly use 85. The goal is to highlight ONLY the target route holds and desaturate everything else including other colored holds on the wall.`

    const promptText = tagImage
      ? `You are analyzing two photos from an indoor climbing gym. The first image is a photo of a climbing route on the wall. The second image is a grade tag mounted on the wall showing the grade and color of climbs in that section. From the tag image read: the grade (e.g. V4) and the hold color indicated by the font color of that grade (e.g. green text means green holds). Use the tag information as the authoritative source for grade and color. From the climb image identify: the route matching the color from the tag, suggested tags from this list: crimpy, slopey, juggy, overhang, slab, pinchy, powerful, balancy, and a one sentence description. Also return hex_base, hex_light, hex_shadow, and tolerance for the identified hold color as before.${colorProfilingInstructions} Return ONLY a valid JSON object with fields: color (from this list only: pink, blue, green, yellow, red, purple, orange, white, black, gray, tan), grade, tags, description, hex_base, hex_light, hex_shadow, tolerance. No markdown, no backticks, no extra text.${hint ? ` The climb to identify has these characteristics: ${hint}.` : ''}`
      : `You are analyzing a photo of an indoor climbing gym wall. Identify a single climbing route and return ONLY a valid JSON object with these exact fields — no markdown, no backticks, no extra text:\n- color: hold color name from this list only: pink, blue, green, yellow, red, purple, orange, white, black, gray, tan\n- grade: suggested V-grade based on hold size, density, and wall angle (e.g. "V3")\n- tags: array from this list only: crimpy, slopey, juggy, overhang, slab, pinchy, powerful, balancy\n- description: one sentence describing the climb\n- hex_base: hex string of the main/average color of the target holds (e.g. "#C03920")\n- hex_light: hex string of the hold color in bright or highlighted areas\n- hex_shadow: hex string of the hold color in shadowed or dark areas\n- tolerance: integer 40–100 for how much color variation exists on the holds — higher means more lighting variation\n${colorProfilingInstructions.trim()}\nIf only one image is provided analyze it as the climb photo only and estimate all fields.${hint ? ` Focus specifically on the climb with these characteristics: ${hint}. Ignore all other climbs in the image.` : ''}`

    const parts = [
      { inline_data: { mime_type: 'image/jpeg', data: mainImage } },
    ]
    if (tagImage) {
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: tagImage } })
    }
    parts.push({ text: promptText })

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
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
