const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('../config');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

/**
 * Transcribe voice message to text using OpenAI Whisper API
 * @param {string} telegramFileUrl - Direct URL to Telegram file
 * @param {string} fileId - Telegram file_id for logging
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeVoice(telegramFileUrl, fileId) {
  try {
    console.log('\n=== VOICE TRANSCRIPTION REQUEST ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`File URL: ${telegramFileUrl}`);
    console.log(`File ID: ${fileId}`);

    // Download the voice file from Telegram
    console.log('⬇️ Downloading voice file from Telegram...');
    const downloadResponse = await axios.get(telegramFileUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 seconds
    });

    const audioBuffer = Buffer.from(downloadResponse.data);
    console.log(`✅ Voice file downloaded, size: ${audioBuffer.length} bytes`);

    console.log('🎤 Using only local Python Whisper transcription');

    // Transcribe using local Python Whisper script
    console.log('🐍 Running local Python transcription script...');
    try {
      const transcription = await transcribeWithPython(audioBuffer);

      if (transcription.success) {
        console.log(`✅ Local Python Whisper transcription: "${transcription.text}"`);
        return {
          success: true,
          text: transcription.text,
          model_used: 'Local Whisper'
        };
      }
    } catch (pythonError) {
      console.log('Local Python Whisper transcription error:', pythonError.message);
    }

    console.warn('❌ All transcription methods failed');
    return {
      success: false,
      error: 'Не удалось транскрибировать голосовое сообщение. Попробуйте записать еще раз или введите текст вручную.'
    };

  } catch (error) {
    console.error('Voice transcription error:', error);
    return {
      success: false,
      error: `Ошибка транскрибации: ${error.message}`
    };
  }
}

/**
 * Download voice file from Telegram using file_id
 * @param {Object} bot - Telegram bot instance
 * @param {string} fileId - Telegram file_id
 * @returns {Promise<string>} - Direct file URL
 */
async function getVoiceFileUrl(bot, fileId) {
  try {
    const fileLink = await bot.getFileLink(fileId);
    return fileLink;
  } catch (error) {
    console.error('Error getting voice file URL:', error);
    throw new Error('Не удалось получить доступ к голосовому файлу');
  }
}

/**
 * Validate voice message before transcription
 * @param {Object} voiceMessage - Telegram voice message object
 * @returns {Object} - Validation result
 */
function validateVoiceMessage(voiceMessage) {
  // Telegram voice messages have duration in seconds
  const duration = voiceMessage.duration || 0;
  const maxDuration = config.MAX_AUDIO_DURATION || 30; // seconds

  if (duration > maxDuration) {
    return {
      valid: false,
      error: `Аудио слишком длинное (${duration} сек). Максимум ${maxDuration} секунд.`
    };
  }

  if (duration < 1) {
    return {
      valid: false,
      error: 'Аудио слишком короткое. Говорите дольше 1 секунды.'
    };
  }

  const mimeType = voiceMessage.mime_type || '';
  if (!mimeType.includes('audio/') && !mimeType.includes('ogg')) {
    return {
      valid: false,
      error: 'Неподдерживаемый формат аудио. Используйте голосовые сообщения Telegram.'
    };
  }

  return { valid: true };
}

/**
 * Convert audio buffer to WAV format
 * @param {Buffer} audioBuffer - Audio data buffer
 * @returns {Promise<Buffer>} - WAV audio buffer
 */
function convertAudioToWav(audioBuffer) {
  return new Promise((resolve, reject) => {
    console.log('� Converting audio to WAV format...');

    // Set ffmpeg path and make sure it's executable
    ffmpeg.setFfmpegPath(ffmpegPath);

    // Ensure ffmpeg binary is executable (common issue on macOS/Linux)
    try {
      fs.accessSync(ffmpegPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch (accessError) {
      console.log('🔧 Fixing ffmpeg permissions...');
      fs.chmodSync(ffmpegPath, 0o755);
    }

    // Create temp files
    const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.ogg`);
    const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.wav`);

    // Write input buffer to file
    fs.writeFile(inputPath, audioBuffer, (err) => {
      if (err) {
        console.error('Error writing temp input file:', err);
        return reject(err);
      }

      ffmpeg(inputPath)
        .inputFormat('ogg')
        .outputFormat('wav')
        .outputOptions(['-acodec pcm_s16le', '-ar 16000', '-ac 1']) // Mono, 16kHz for better compatibility
        .output(outputPath)
        .on('error', (err) => {
          console.error('FFmpeg conversion error:', err.message);
          // Cleanup temp files
          fs.unlink(inputPath, () => {});
          fs.unlink(outputPath, () => {});
          reject(err);
        })
        .on('end', () => {
          // Read converted file
          fs.readFile(outputPath, (err, wavBuffer) => {
            // Cleanup temp files
            fs.unlink(inputPath, () => {});
            fs.unlink(outputPath, () => {});

            if (err) {
              console.error('Error reading converted file:', err);
              return reject(err);
            }

            console.log(`✅ Audio converted to WAV, size: ${wavBuffer.length} bytes`);
            resolve(wavBuffer);
          });
        })
        .run();
    });
  });
}

/**
 * Locally transcribe audio using Python script
 * @param {Buffer} audioBuffer - Audio data buffer
 * @returns {Promise<Object>} - Transcription result
 */
function transcribeWithPython(audioBuffer) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'transcribe.py');

    console.log('🐍 Running local Python transcription script...');

    // Use venv with whisper installed
    const venvPython = path.join(__dirname, '../../venv_whisper/bin/python3');

    const pythonProcess = spawn(venvPython, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(__dirname)
    });

    let stdout = '';
    let stderr = '';

    const base64Data = audioBuffer.toString('base64');
    pythonProcess.stdin.write(base64Data);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process failed with code ${code}: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Invalid Python output: ${parseError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python transcription timeout'));
    }, 180000); // 3 minutes for model loading and transcription (for small model)
  });
}

module.exports = {
  transcribeVoice,
  getVoiceFileUrl,
  validateVoiceMessage
};
