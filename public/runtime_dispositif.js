const settings = {};

let nextDestination = 'p';
let playList = [];
let isPlaying = false;
let history = []; // Not used yet
let lastPlayedSound = null;

let producerInterval = null;
let consumerInterval = null;

let socket;
let fakeSensorTimeout;
let ignoreSensor = true;

function reset() {
  $('#status').text('RESETTING');
  clearInterval(producerInterval);
  clearTimeout(consumerInterval);
  clearTimeout(fakeSensorTimeout);
  Howler.unload();
  nextDestination = 'p';
  playList = [];
  isPlaying = false;
  history = [];
  lastPlayedSound = null;

  brownNoise();
}

let failureCount = 0;

addEventListener('error', (e) => {
  console.error(e);
  failureCount++;
  if (failureCount > 4) {
    setTimeout(() => {
      restart();
    }, 1000);
    failureCount = 0;
  }
});

function brownNoise() {
  new Howl({
    src: [`/brownNoise.mp3`],
    preload: true,
    autoplay: true,
    loop: true,
    volume: 0.01,
  });
}

$(document).ready(() => {
  $('#status').text('INIT');

  // Refresh #sincelast and #playlist every second
  setInterval(() => {
    const now = new Date();
    if (lastPlayedSound !== null) {
      $('#sincelast').text(
          `Current sound since ${((now.getTime() - lastPlayedSound.getTime()) / 1000).toFixed(0)} s.`,
      );
    } else {
      $('#sincelast').text('...');
    }
    let playlistString = "";
    for (const sentence of playList) {
      playlistString += `<li>${sentence._id}</li>`;
    }
    $('#playlist').html(playlistString);
  }, 1000);

  // Fetch settings
  $.post('/settings')
      .done(function (res) {
        console.clear();
        if (res.done && res.settings) {
          for (let key in res.settings) {
            settings[key] = res.settings[key];
            if (typeof settings[key] === 'string') {
              if (settings[key] === 'true' || settings[key] === 'false') {
                settings[key] = settings[key] === 'true';
              } else if (/^-?\d+\.\d+$/.test(settings[key])) {
                settings[key] = parseFloat(settings[key]);
              } else if (/^-?\d+$/.test(settings[key])) {
                settings[key] = parseInt(settings[key]);
              }
            }
            console.log(`Setting: ${key}: ${settings[key]}.`);
          }

          socket = io();
          $('#generalVolume').val(settings.whisperVolume);
          $('#generalVolume').on('change', () => {
            let newVal = parseFloat($('#generalVolume').val());
            if (isNaN(newVal)) {
              console.log("Bad volume value, restoring previous one");
              $('#generalVolume').val(settings.whisperVolume);
            } else {
              console.log(`Setting volume to value ${newVal}`);
              $('#generalVolume').val(newVal);
              settings.whisperVolume = newVal;
              $.post('/settings', {
                newSettings: settings,
              })
                  .done(function () {})
                  .fail(function (e) {
                    console.error(e);
                  });
            }
          });
          $('#motion').on('click', () => {
            motionStart(true);
          });
          socket.on('motion-start', () => {
            $('#sensor').removeClass('btn-danger').addClass('btn-success');
            $('#sensor').text('Sensor ON');
            motionStart(false);
          });
          socket.on('motion-end', () => {
            $('#sensor').removeClass('btn-danger').addClass('btn-success');
            $('#sensor').text('Sensor ON');
            motionEnd();
          });
          socket.on('no-sensor', () => {
            $('#sensor').removeClass('btn-success').addClass('btn-danger');
            $('#sensor').text('Sensor OFF');
          });
          setTimeout(() => {
            $('#sensor-ignored').removeClass('btn-warning').addClass('btn-info').text('Sensor Active');
            ignoreSensor = false;
          }, settings.ignoreSensorDelay * 1000);
          $('#status').text('WAITING');

          // START
          setTimeout(() => {
            restart();
          }, settings.startDelay * 1000);

        } else {
          console.error('NO SETTINGS');
        }
      })
      .fail(function (e) {
        console.error(e);
      });
});

// Continuously plays an almost inaudible "brown noise" in order to prevent
// the Bluetooth speaker to turn itself off automatically after a while:
function restart() {
  reset();
  producerInterval = setInterval(async () => {
    await fetchNewSounds();
  }, 1000);
  consumerInterval = setInterval(async () => {
    playNextSound();
  }, 1000);
}

/**
 * L'algorithme implémenté est de type "producteur-consommateur" à travers la liste playList
 * - Le producteur s'assure que la playList est toujours remplie avec au moins 2 sons. Dès
 * que la liste contient moins de 2 sons il en rajoute (et c'est là que se situe l'algorithme de choix
 * voix interieure / voix publique, les partitions
 * - Le consommateur se contente de lire la playList et de jouer les sons qui y figurent. Lorsqu'un son
 * est joué il est retiré de la liste
 */

/**
 * Playlist producer
 */
async function fetchNewSounds() {
  if (playList.length < 2) {
    // On alterne entre "p" et "i"
    switch (nextDestination) {
      case 'p':
        await fetchPublic();
        nextDestination = 'i';
        break;
      case 'i':
        await fetchInterior();
        nextDestination = 'p';
    }
  }
}

const PUBLIC_SUBJECTS = ['identite', 'pythie', 'politique', 'ia', 'langue'];
let remainingPublicSubjectsToChoose = [];

/**
 * Choix d'un sujet au hasard, avec la certitude que tous les sujets vont être choisis une fois
 * puis on remet tous les sujets et on tire une nouvelle fois, et ainsi de suite
 */
function chooseRandomPublicSubject() {
  // Reload list if necessary
  if (remainingPublicSubjectsToChoose.length === 0) {
    remainingPublicSubjectsToChoose = [...PUBLIC_SUBJECTS];
    remainingPublicSubjectsToChoose = chance.shuffle(remainingPublicSubjectsToChoose);
  }

  return remainingPublicSubjectsToChoose.shift();
}

const TYPE_LENT = 'lent';
const TYPE_RAPIDE = 'rapide';
const TYPE_REPETITIF_LENT = 'repetitif-lent';
const TYPE_REPETITIF_RAPIDE = 'repetitif-rapide';
const TYPE_BEGUE = 'begue';
const TYPE_COURT = 'court';
const TYPE_JE_SUIS = 'jesuis';
const TYPE_MA_VOIX = 'mavoix';
const TYPE_SILENCE = 'silence';

/**
 * Description des partitions
 */
const PUBLIC_PARTITIONS = [
  [TYPE_RAPIDE, TYPE_LENT, TYPE_REPETITIF_RAPIDE, TYPE_REPETITIF_LENT, TYPE_BEGUE, TYPE_COURT, TYPE_JE_SUIS, TYPE_MA_VOIX],
  [TYPE_RAPIDE, TYPE_REPETITIF_RAPIDE, TYPE_COURT, TYPE_JE_SUIS, TYPE_MA_VOIX],
  [TYPE_MA_VOIX, TYPE_REPETITIF_LENT, TYPE_BEGUE, TYPE_COURT, TYPE_JE_SUIS],
  [TYPE_RAPIDE, TYPE_LENT, TYPE_REPETITIF_RAPIDE, TYPE_REPETITIF_LENT, TYPE_BEGUE, TYPE_COURT, TYPE_JE_SUIS, TYPE_MA_VOIX, TYPE_REPETITIF_RAPIDE, TYPE_REPETITIF_LENT],
  [TYPE_LENT, TYPE_COURT, TYPE_COURT, TYPE_JE_SUIS, TYPE_SILENCE, TYPE_BEGUE, TYPE_COURT, TYPE_LENT],
  [TYPE_REPETITIF_RAPIDE, TYPE_MA_VOIX, TYPE_BEGUE, TYPE_COURT, TYPE_COURT],
  [TYPE_REPETITIF_LENT, TYPE_JE_SUIS, TYPE_COURT, TYPE_COURT, TYPE_LENT, TYPE_MA_VOIX, TYPE_RAPIDE, TYPE_RAPIDE, TYPE_BEGUE, TYPE_LENT, TYPE_REPETITIF_RAPIDE, TYPE_JE_SUIS, TYPE_JE_SUIS, TYPE_RAPIDE],
  [TYPE_COURT, TYPE_JE_SUIS, TYPE_MA_VOIX, TYPE_REPETITIF_RAPIDE, TYPE_BEGUE, TYPE_SILENCE, TYPE_COURT, TYPE_COURT, TYPE_RAPIDE, TYPE_SILENCE, TYPE_JE_SUIS, TYPE_REPETITIF_LENT, TYPE_MA_VOIX],
  [TYPE_MA_VOIX, TYPE_LENT, TYPE_SILENCE, TYPE_BEGUE, TYPE_RAPIDE, TYPE_COURT, TYPE_RAPIDE],
  [TYPE_BEGUE, TYPE_REPETITIF_LENT, TYPE_LENT, TYPE_JE_SUIS],
  [TYPE_REPETITIF_RAPIDE, TYPE_SILENCE, TYPE_REPETITIF_RAPIDE, TYPE_REPETITIF_LENT, TYPE_LENT, TYPE_SILENCE, TYPE_COURT, TYPE_COURT],
  [TYPE_RAPIDE, TYPE_COURT, TYPE_RAPIDE, TYPE_COURT, TYPE_REPETITIF_RAPIDE, TYPE_COURT, TYPE_MA_VOIX],
  [TYPE_LENT, TYPE_REPETITIF_LENT, TYPE_JE_SUIS, TYPE_LENT],
  [TYPE_COURT, TYPE_LENT, TYPE_COURT, TYPE_JE_SUIS],
  [TYPE_RAPIDE, TYPE_REPETITIF_RAPIDE, TYPE_SILENCE, TYPE_MA_VOIX, TYPE_MA_VOIX],
  [TYPE_JE_SUIS, TYPE_BEGUE, TYPE_JE_SUIS, TYPE_LENT, TYPE_JE_SUIS, TYPE_RAPIDE, TYPE_JE_SUIS, TYPE_COURT],
  [TYPE_MA_VOIX, TYPE_LENT, TYPE_MA_VOIX, TYPE_LENT, TYPE_MA_VOIX, TYPE_REPETITIF_LENT, TYPE_MA_VOIX, TYPE_RAPIDE, TYPE_MA_VOIX, TYPE_REPETITIF_RAPIDE, TYPE_MA_VOIX],
  [TYPE_COURT, TYPE_COURT, TYPE_LENT, TYPE_COURT, TYPE_COURT, TYPE_RAPIDE, TYPE_COURT, TYPE_COURT, TYPE_SILENCE, TYPE_LENT, TYPE_REPETITIF_LENT],
  [TYPE_REPETITIF_LENT, TYPE_JE_SUIS, TYPE_REPETITIF_LENT, TYPE_RAPIDE, TYPE_RAPIDE, TYPE_JE_SUIS, TYPE_LENT, TYPE_LENT],
  [TYPE_MA_VOIX, TYPE_RAPIDE, TYPE_COURT, TYPE_REPETITIF_LENT, TYPE_MA_VOIX, TYPE_LENT, TYPE_JE_SUIS, TYPE_MA_VOIX],
  [TYPE_MA_VOIX, TYPE_BEGUE, TYPE_LENT, TYPE_COURT, TYPE_COURT, TYPE_COURT, TYPE_SILENCE, TYPE_REPETITIF_LENT, TYPE_JE_SUIS],
  [TYPE_JE_SUIS, TYPE_LENT, TYPE_REPETITIF_LENT, TYPE_RAPIDE],
  [TYPE_RAPIDE, TYPE_REPETITIF_LENT, TYPE_REPETITIF_RAPIDE, TYPE_JE_SUIS, TYPE_JE_SUIS],
  [TYPE_COURT, TYPE_COURT, TYPE_JE_SUIS, TYPE_COURT, TYPE_JE_SUIS],
  [TYPE_LENT, TYPE_REPETITIF_LENT, TYPE_JE_SUIS, TYPE_JE_SUIS, TYPE_SILENCE, TYPE_RAPIDE, TYPE_REPETITIF_RAPIDE, TYPE_MA_VOIX, TYPE_MA_VOIX, TYPE_LENT, TYPE_BEGUE, TYPE_REPETITIF_RAPIDE, TYPE_COURT, TYPE_COURT, TYPE_MA_VOIX],
  [TYPE_MA_VOIX, TYPE_RAPIDE, TYPE_REPETITIF_LENT, TYPE_REPETITIF_RAPIDE, TYPE_JE_SUIS, TYPE_LENT, TYPE_COURT, TYPE_COURT, TYPE_COURT, TYPE_SILENCE, TYPE_LENT, TYPE_MA_VOIX, TYPE_LENT, TYPE_RAPIDE, TYPE_JE_SUIS, TYPE_BEGUE, TYPE_JE_SUIS, TYPE_LENT, TYPE_COURT, TYPE_COURT, TYPE_COURT, TYPE_SILENCE, TYPE_MA_VOIX, TYPE_LENT, TYPE_REPETITIF_RAPIDE],
]
let remainingPublicPartitionsToChoose = [];

/**
 * Choix d'une partition au hasard, avec la certitude que toutes les partitions vont être choisies une fois
 * puis on remet toutes les partitions et on tire une nouvelle fois, et ainsi de suite
 */
function chooseRandomPublicPartition() {
  // Reload list if necessary
  if (remainingPublicPartitionsToChoose.length === 0) {
    remainingPublicPartitionsToChoose = [...PUBLIC_PARTITIONS];
    remainingPublicPartitionsToChoose = chance.shuffle(remainingPublicPartitionsToChoose);
  }

  return remainingPublicPartitionsToChoose.shift();
}

const SILENCE_ID = 'silence';
/**
 * Durées des silences (en secondes) : choix au hasard parmi ces valeurs
 */
const SILENCE_LENGTHS = [15, 30];

async function fetchPublic() {
  const subject = chooseRandomPublicSubject();
  const partition = chooseRandomPublicPartition();
  for (const type of partition) {
    if (type === TYPE_SILENCE) {
      playList.push({_id:SILENCE_ID, destination:'p', duration: chance.pickone(SILENCE_LENGTHS)});
    } else {
      await fetchAndAddToPlayList('p', 'w', subject, type);
    }
  }
}

async function fetchInterior() {
  await fetchAndAddToPlayList('i', 'w','souffle', '');
}

async function fetchAndAddToPlayList(destination, voice, subject, type) {
  const query = {destination, voice, subject, type};
  const sentence = await pickOne(query);
  playList.push(sentence);
}

async function pickOne(query) {
  console.log('PickOne', JSON.stringify(query));
  try {
    const res = await $.post('/pick-one', { query: query, history: history }).promise();
    if (res.done && res.sentence)
      return res.sentence;
    else {
      console.log("Unexpected response");
      console.log(res);
      return null;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Playlist consumer
 */
function playNextSound() {
  if (playList.length === 0) {
    console.log('Playlist currently empty, waiting...');
    return;
  }
  if (!isPlaying) {
    const sentence = playList.shift();
    playSound(sentence);
  }
}

function playSound(sentence) {
  if (!sentence) {
    console.log("Warning : no sentence provided");
    return;
  }
  if (isPlaying)
    return; // Already playing another sound
  isPlaying = true;
  console.log("Playing")
  console.log(sentence)

  $('#status').text(sentence.destination === 'p' ? 'PUBLIC VOICE' : 'INTERIOR VOICE');
  $('#current').text(sentence._id);
  lastPlayedSound = new Date();

  if (sentence._id === SILENCE_ID) {
    $('#current').text(sentence._id + ` ${sentence.duration}s`);
    setTimeout(onSilenceEnd, sentence.duration * 1000);
  }
  else {
    const sound = loadSound(sentence.clip);
    sound.play();
    sound.on('end', () => {
      isPlaying = false;
      console.log("Finished playing sound");
      $('#current').text("...");
      playNextSound();
      sound.unload();
    });
  }
}

function onSilenceEnd() {
  isPlaying = false;
  console.log("Finished playing silence");
  $('#current').text("...");
  playNextSound();
}

function loadSound(filename) {
  const sound = new Howl({
    src: [`/runtime/${filename}`],
    preload: true,
    volume: settings.whisperVolume,
    autoplay: false,
    loop: false,
  });
  return sound;
}

/**
 * Sensor management
 */
function motionStart(fake) {
  clearTimeout(fakeSensorTimeout);
  if (fake || ignoreSensor === false) {
    $('#someone').removeClass('btn-secondary').addClass('btn-success');
    $('#someone').text('Présence');
    if (fake === true) {
      fakeSensorTimeout = setTimeout(() => {
        motionEnd(true);
      }, 3 * 1000);
    }
  } else {
    if (fake === true) {
      fakeSensorTimeout = setTimeout(() => {
        motionEnd(true);
      }, 3 * 1000);
    } else {
      console.log('(Ignore motion)');
    }
  }
}

function motionEnd() {
  clearTimeout(fakeSensorTimeout);
  if (!ignoreSensor) {
    $('#someone').removeClass('btn-success').addClass('btn-secondary');
    $('#someone').text('Absence');
  } else {
    console.log('(Ignore absence)');
  }
}
