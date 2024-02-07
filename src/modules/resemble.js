require('./env');

const { Resemble: importResemble } = require('@resemble/node') ;

importResemble.setApiKey(process.env.RESEMBLE_API_TOKEN);

class Resemble {
  constructor() {
    this.api = importResemble.v2;
  }

  getVoiceByEmotion(emotion) {
    let voiceUuid;
    switch (emotion) {
      case 1:
      case 'question':
        voiceUuid = process.env.RESEMBLE_INTERROGATION_VOICE_UUID;
        break;
      case 2:
      case 'emotional':
        voiceUuid = process.env.RESEMBLE_EMOTIONAL_VOICE_UUID;
        break;
      case 3:
      case 'whisper':
        voiceUuid = process.env.RESEMBLE_WHISPER_VOICE_UUID;
        break;
      default:
        voiceUuid = process.env.RESEMBLE_NATURAL_VOICE_UUID;
        break;
    }
    return voiceUuid;
  }

  getPitchByNumericValue(value) {
    let pitch;
    switch (value) {
      case 1:
        pitch = 'x-low';
        break;
      case 2:
        pitch = 'low';
        break;
      case 4:
        pitch = 'high';
        break;
      case 5:
        pitch = 'x-high';
        break;
      default:
        pitch = 'medium';
        break;
    }
    return pitch;
  }

  getEmotionPitchByNumericValue(value) {
    let pitch;
    switch (value) {
      case 1:
        pitch = 0.1;
        break;
      case 2:
        pitch = 0.3;
        break;
      case 4:
        pitch = 0.7;
        break;
      case 5:
        pitch = 0.9;
        break;
      default:
        pitch = 0.5;
        break;
    }
    return pitch;
  }

  getVolumeByNumericValue(value) {
    let volume;
    switch (value) {
      case 1:
        volume = 'x-soft';
        break;
      case 2:
        volume = 'soft';
        break;
      case 4:
        volume = 'loud';
        break;
      case 5:
        volume = 'x-loud';
        break;
      default:
        volume = 'medium';
        break;
    }
    return volume;
  }

  getEmotionVolumeByNumericValue(value) {
    let volume;
    switch (value) {
      case 1:
        volume = 0.1;
        break;
      case 2:
        volume = 0.3;
        break;
      case 4:
        volume = 0.7;
        break;
      case 5:
        volume = 0.9;
        break;
      default:
        volume = 0.5;
        break;
    }
    return volume;
  }

  getRateByNumericValue(value) {
    let rate = `${value}%`;
    return rate;
  }

  getEmotionRateByNumericValue(value) {
    let rate = (value / 200.0).toFixed(1);
    return rate;
  }

  async getProjects() {
    return await this.api.projects.all(1);
  }

  async createClip(uuid, voice_uuid, text) {
    return await this.api.clips.createAsync(process.env.RESEMBLE_PROJECT_UUID, {
      title: uuid,
      body: text,
      voice_uuid: voice_uuid,
      is_public: false,
      is_archived: false,
      callback_uri: `http://${process.env.HTTP_BASE_URI}:${process.env.HTTP_PORT}/listen`,
    });
  }

  async createClipSync(uuid, voice_uuid, text) {
    return await this.api.clips.createSync(process.env.RESEMBLE_PROJECT_UUID, {
      title: uuid,
      body: text,
      voice_uuid: voice_uuid,
      is_public: false,
      is_archived: false,
      output_format: 'mp3',
    });
  }

  async getAllClips() {
    return await this.api.clips.all(process.env.RESEMBLE_PROJECT_UUID, 1, 1000);
  }

  async delete(id) {
    return await this.api.clips.delete(process.env.RESEMBLE_PROJECT_UUID, id);
  }

  async getClip(id) {
    return await this.api.clips.get(process.env.RESEMBLE_PROJECT_UUID, id);
  }
}

exports.Resemble = new Resemble();
