// OpenAI TTS (POST) ===
export async function playTTS_OpenAI(text) {
  try {
    const response = await fetch("/tts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }), 
    });

    if (!response.ok) throw new Error(`TTS 요청 실패 (${response.status})`);

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    await audio.play();

    console.log("[TTS] 서버 프록시 통해 음성 출력 중...");
  } catch (err) {
    console.error("[TTS ERROR] 재생 실패:", err);
  }
}
