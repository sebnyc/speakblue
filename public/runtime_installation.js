const settings = {};
const sounds = [];
const soundsNext = [];
const soundsDelay = [];
const soundsFading = [];
const runtimeFrequency = 50;
const history = [];
const partition = [];
const voices = ['n', 'w', 'e', 'i'];
const subjects = ['ai', 'capital', 'decolonial', 'ecologie', 'identite', 'politique'];
const subjectsSB = ['adresse', 'ai', 'decolonial', 'ecologie', 'identite'];
const types = ['attack', 'resist', 'transition'];
const miscInterior = [
  'bloc',
  'commentaires',
  'djeune',
  'jesuis',
  'mavoix',
  'meteo',
  'soufflecourt',
  'soufflelong',
  'speed',
  'sujet',
  'unevoix',
];
const miscPublic = [
  'adresse',
  'bloc',
  'commentaires',
  'djeune',
  'liaisondebut',
  'meteo',
  'soufflecourt',
  'soufflelong',
  'transition',
  'unevoix',
];
const tags = ['optimist', 'pessimist', 'complice+', 'complice-', 'empatic', 'colere'];
const score = {
  attack: 0,
  resist: 0,
  optimist: 0,
  pessimist: 0,
  'complice+': 0,
  'complice-': 0,
  empatic: 0,
  colere: 0,
};

let i_partitions = [];
let p_partitions = [];
const interior_parts = ['respire', 'random_partition', 'partition', 'random'];
const public_parts = ['random_partition', 'partition', 'random'];
let inSilence = false;
let inPartitionCount = 0;
let isPartitionRespire = false;
let publicPartitionCount = 0;
let failureCount = 0;

let socket;
let silenceTimeout = null;
let runtimeInterval = null;
let restartTimeout = null;
let inPause = false;
let currentIndex = 0;
let oldCurrentIndex = -1;
let coolDown = 0;
let backToInteriorTimeout;
let fakeSensorTimeout;
let currentDestination = null;
let currentVoice = null;
let currentSubject = null;
let currentType = null;
let currentTag = null;
let ignoreSensor = true;
let backToInterior = false;
let goToPublic = false;
let gotNext = false;
let lastPlayedSound = null;
let choraleCount = 0;
let playingChorale = false;
let launchingChorale = false;
let countdownToSilence = -1;
let picking = false;
let backToInteriorTimer = null;

addEventListener('error', (e) => {
  console.error(e);
  failureCount++;
  if (failureCount > 4) {
    restart(10);
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

function reset() {
  $('#status').text('RESET');
  clearInterval(runtimeInterval);
  clearTimeout(silenceTimeout);
  clearTimeout(restartTimeout);
  clearTimeout(fakeSensorTimeout);
  clearTimeout(backToInteriorTimeout);
  inPause = false;
  runtimeInterval = setInterval(runtime, runtimeFrequency);
  Howler.unload();
  sounds.splice(0, sounds.length);
  soundsNext.splice(0, soundsNext.length);
  soundsDelay.splice(0, soundsDelay.length);
  soundsFading.splice(0, soundsFading.length);
  partition.splice(0, partition.length);
  currentIndex = 0;
  oldCurrentIndex = -1;
  coolDown = 0;
  currentDestination = null;
  currentVoice = null;
  currentSubject = null;
  currentType = null;
  currentTag = null;
  backToInterior = false;
  goToPublic = false;
  gotNext = false;
  lastPlayedSound = null;
  choraleCount = 0;
  playingChorale = false;
  launchingChorale = false;
  inSilence = false;
  inPartitionCount = 0;
  isPartitionRespire = false;
  publicPartitionCount = 0;
  countdownToSilence--;
  if (countdownToSilence < 0) {
    countdownToSilence = -1;
  }
  picking = false;
  backToInteriorTimer = null;
  while (history.length > 31) {
    history.shift();
  }
  brownNoise();
}

function restart(delay) {
  delay = delay || settings.restartDelay;
  reset();
  if (delay) {
    inPause = true;
    restartTimeout = setTimeout(() => {
      start();
    }, delay * 1000);
  } else {
    inPause = false;
    start();
  }
}

function start() {
  if (picking === true) {
    console.log('Skip start (picking in progress)');
    return;
  }
  currentDestination = 'i';
  $('#status').text('INTERIOR VOICE');
  let queries = [];
  let query = {};
  let count = 1;
  if (countdownToSilence === -1) {
    countdownToSilence = chance.integer({ min: 0, max: 3 });
  }
  chance.shuffle(interior_parts);
  let choice = chance.pickone(interior_parts);
  if (choice === 'respire') {
    chance.shuffle(i_partitions);
    let n = chance.integer({ min: 1, max: 4 });
    for (let i = 0; i < i_partitions.length; i++) {
      if (/respire/i.test(i_partitions[i])) {
        query = {
          sb: i_partitions[i],
        };
        queries.push(query);
        if (queries.length === n) {
          break;
        }
      }
    }
  } else if (choice === 'random_partition') {
    chance.shuffle(i_partitions);
    query = {
      sb: chance.pickone(i_partitions),
    };
    queries.push(query);
  } else if (choice === 'partition') {
    chance.shuffle(i_partitions);
    for (let i = 0; i < i_partitions.length; i++) {
      if (/respire/i.test(i_partitions[i]) === false) {
        query = {
          sb: i_partitions[i],
        };
        queries.push(query);
        break;
      }
    }
  } else {
    count = chance.integer({ min: 5, max: 30 });
    if (currentDestination === null) {
      query.destination = 'i';
      chance.shuffle(miscInterior);
      query.subject = chance.pickone(miscInterior);
    } else {
      query.destination = 'i';
      if (currentVoice === 'n' || currentVoice === 'w') {
        query.voice = currentVoice;
      } else {
        query.voice = chance.pickone(['w', 'n']);
      }
      if (miscInterior.indexOf(currentSubject) !== -1) {
        query.subject = currentSubject;
      }
    }
    queries.push(query);
  }
  pick(queries, count, count > 1);
}

function getNext(change) {
  if (picking === true) {
    console.log('Skip getNext (picking in progress)');
    return;
  }
  let queries = [];
  if (change) {
    if (change.destination) {
      console.log(`*** CHANGE DESTINATION from ${currentDestination} to ${change.destination} ***`);
      if (change.destination === 'i') {
        console.log(`getNext(i): restart(0)`);
        restart(0);
      } else {
        currentDestination = 'p';
        $('#status').text('PUBLIC VOICE');
        queries.push({ adresse: true });
        let query = {};
        let count = 1;
        chance.shuffle(public_parts);
        let choice = chance.pickone(public_parts);
        console.log(`getNext(p): pick ${choice}`);
        if (choice === 'random_partition') {
          chance.shuffle(p_partitions);
          query = {
            sb: chance.pickone(p_partitions),
          };
          queries.push(query);
        } else if (choice === 'partition') {
          chance.shuffle(p_partitions);
          query = {
            sb: chance.pickone(p_partitions),
          };
          queries.push(query);
        } else {
          chance.shuffle(subjects);
          count = chance.integer({ min: 5, max: 30 });
          query.destination = 'p';
          query.subject = chance.pickone(subjects);
          queries.push(query);
        }
        pick(queries, count, count > 1);
      }
    }
  } else {
    if (currentDestination === 'i') {
      if (countdownToSilence === 0) {
        const longPause = chance.integer({ min: 30, max: 2 * 60 });
        console.log(`getNext(): interior restart(${longPause})`);
        restart();
      } else {
        console.log(`getNext(): interior restart(0)`);
        restart(0);
      }
    } else {
      publicPartitionCount++;
      if (publicPartitionCount > 1) {
        console.log(`getNext(): public restart(0)`);
        restart(0);
      } else {
        currentDestination = 'p';
        $('#status').text('PUBLIC VOICE');
        let query = {};
        let count = 1;
        chance.shuffle(public_parts);
        chance.shuffle(p_partitions);
        let choice = chance.pickone(public_parts);
        console.log(`getNext(): public pick ${choice}`);
        if (choice === 'random_partition') {
          query = {
            sb: chance.pickone(p_partitions),
          };
          queries.push(query);
        } else if (choice === 'partition') {
          query = {
            sb: chance.pickone(p_partitions),
          };
          queries.push(query);
        } else {
          chance.shuffle(subjects);
          count = chance.integer({ min: 5, max: 30 });
          query.destination = 'p';
          query.subject = chance.pickone(subjects);
          queries.push(query);
        }
        pick(queries, count, count > 1);
      }
    }
  }
}

function pick(query, quantity, random, forChorale) {
  if (picking === true) {
    console.log('Skip pick (picking in progress)');
    return;
  }
  picking = true;
  console.log('Pick', JSON.stringify(query), quantity, random, forChorale);
  $.post('/pick', { query: query, quantity: quantity, random: random, history: forChorale ? [] : history })
    .done(function (res) {
      if (res.done && res.sentences && res.sentences.length > 0) {
        for (let i = 0; i < res.sentences.length; i++) {
          if (Array.isArray(res.sentences[i].clips) && res.sentences[i].clips.length > 0) {
            partition.push(res.sentences[i]);
            inPartitionCount++;
            if (/respire/i.test(res.sentences[i]._id)) {
              isPartitionRespire = true;
            } else {
              isPartitionRespire = false;
            }
            if (res.sentences[i]._id !== 'silence' && !forChorale) {
              history.push(res.sentences[i]._id);
              while (history.length > 255) {
                history.shift();
              }
            }
            loadSound(
              chance.pickone(res.sentences[i].clips),
              chance.integer({
                min: settings.minNextDelay * 2,
                max: settings.maxNextDelay * 2,
              }) / 2,
              res.sentences[i].voice.indexOf('w') !== -1,
              forChorale,
            );
          } else if (res.sentences[i].pause) {
            loadSound(`_${res.sentences[i].pause}`, 0);
          }
        }
        picking = false;
      } else if (!forChorale) {
        console.log('Got nothing, restart...');
        restart(0);
      }
    })
    .fail(function (e) {
      console.error(e);
      failureCount++;
      if (failureCount > 4) {
        restart(10);
        failureCount = 0;
      } else {
        picking = false;
        getNext();
      }
    });
}

function motionStart(fake) {
  clearTimeout(fakeSensorTimeout);
  if (fake || ignoreSensor === false) {
    $('#someone').removeClass('btn-secondary').addClass('btn-success');
    $('#someone').text('Présence');
    clearTimeout(backToInteriorTimeout);
    backToInteriorTimer = settings.backToInteriorDelay;
    console.log(`Should go back to interior in ${settings.backToInteriorDelay} seconds (#1).`);
    backToInteriorTimeout = setTimeout(() => {
      goToPublic = false;
      backToInterior = true;
    }, settings.backToInteriorDelay * 1000);
    if (currentDestination === 'i') {
      goToPublic = true;
      backToInterior = false;
      if (isPartitionRespire || inSilence || inPause) {
        if (inSilence) {
          clearTimeout(silenceTimeout);
        }
        if (inPause) {
          clearTimeout(restartTimeout);
          inPause = false;
        }
        console.log('Will go to public NOW!');
        clearInterval(runtimeInterval);
        // ??? goToPublic = false;
        if (sounds[currentIndex] && typeof sounds[currentIndex].unload === 'function') {
          sounds[currentIndex].fade(
            currentVoice === 'w' ? settings.whisperVolume : 1,
            0,
            settings.fadingDuration * 500,
          );
        }
        sounds[currentIndex] = null;
        currentIndex++;
        for (let k = currentIndex; k < sounds.length; k++) {
          if (partition[k] && history.indexOf(partition[k]._id) !== -1) {
            history.splice(history.indexOf(partition[k]._id), 1);
          }
          if (sounds[k] && typeof sounds[k].unload === 'function') {
            sounds[k].unload();
            sounds[k] = null;
          }
        }
        sounds.splice(currentIndex);
        soundsNext.splice(currentIndex);
        soundsDelay.splice(currentIndex);
        soundsFading.splice(currentIndex);
        partition.splice(currentIndex);
        getNext({
          destination: 'p',
        });
        if (inSilence) {
          coolDown = 0;
          inSilence = false;
        }
        runtimeInterval = setInterval(runtime, runtimeFrequency);
      } else {
        console.log(`Will go to public in ${settings.backToInteriorDelay} seconds...`);
      }
    } else {
      console.log('(Already in public, ignore)');
    }
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
  if (ignoreSensor === false) {
    $('#someone').removeClass('btn-success').addClass('btn-secondary');
    $('#someone').text('Absence');
    if (currentDestination === 'p') {
      clearTimeout(backToInteriorTimeout);
      backToInteriorTimer = settings.backToInteriorDelay;
      console.log(`Should go back to interior in ${settings.backToInteriorDelay} seconds (#2).`);
      backToInteriorTimeout = setTimeout(() => {
        goToPublic = false;
        backToInterior = true;
      }, settings.backToInteriorDelay * 1000);
    } else {
      console.log('(Already in interior, ignore)');
    }
  } else {
    console.log('(Ignore absence)');
  }
}

function chorale() {
  pick([{ chorale: true }], chance.integer({ min: settings.minChorale, max: settings.maxChorale }), true, true);
}

$(document).ready(() => {
  $('#status').text('INIT');

  setInterval(() => {
    const now = new Date();

    if (lastPlayedSound !== null) {
      $('#sincelast').text(
        `Sec. since last sound: ${((now.getTime() - lastPlayedSound.getTime()) / 1000).toFixed(0)}/${
          settings.maxSilence
        }`,
      );
    } else {
      $('#sincelast').text('...');
    }

    if (backToInteriorTimer !== null) {
      $('#timeout').text(`Interior in ${backToInteriorTimer}...`);
      backToInteriorTimer--;
      if (backToInteriorTimer < 0) {
        backToInteriorTimer = 0;
      }
    } else {
      $('#timeout').text('...');
    }
  }, 1000);

  brownNoise();

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
        $.post('/parts')
          .done(function (res) {
            if (res.done && res.parts && res.parts.iparts && res.parts.pparts) {
              for (let ip = 0; ip < res.parts.iparts.length; ip++) {
                i_partitions.push(res.parts.iparts[ip]);
              }
              for (let pp = 0; pp < res.parts.pparts.length; pp++) {
                p_partitions.push(res.parts.pparts[pp]);
              }
              socket = io();
              $('#whisperVolume').val(settings.whisperVolume);
              $('#whisperVolume').on('change', () => {
                let newVal = parseFloat($('#whisperVolume').val());
                if (isNaN(newVal)) {
                  $('#whisperVolume').val(settings.whisperVolume);
                } else {
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
              $('#chorale').on('click', () => {
                chorale();
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
              setTimeout(() => {
                restart(0);
              }, settings.startDelay * 1000);
            } else {
              console.error('NO PARTS');
            }
          })
          .fail(function (e) {
            console.error(e);
          });
      } else {
        console.error('NO SETTINGS');
      }
    })
    .fail(function (e) {
      console.error(e);
    });
});

function runtime() {
  const now = new Date();
  if (coolDown > 0) {
    coolDown--;
  } else {
    coolDown = 0;
  }

  if (playingChorale === true && choraleCount <= 0) {
    restart(chance.integer({ min: 30, max: 3 * 60 }));
    return;
  }

  if (lastPlayedSound !== null && now.getTime() - lastPlayedSound.getTime() > settings.maxSilence * 1000) {
    restart(0);
    return;
  }

  if (typeof sounds[currentIndex] === 'string' && /^_\d+$/.test(sounds[currentIndex]) === true) {
    let pauseCount = parseInt(sounds[currentIndex].replace(/\D/gim, '').trim());
    clearInterval(runtimeInterval);
    clearTimeout(silenceTimeout);
    inSilence = true;
    if (gotNext === false && currentIndex === sounds.length - 1) {
      gotNext = true;
      getNext();
    }
    silenceTimeout = setTimeout(() => {
      soundsNext[currentIndex] = true;
      coolDown = 0;
      currentIndex++;
      inSilence = false;
      runtimeInterval = setInterval(runtime, runtimeFrequency);
    }, pauseCount * 1000);
  }

  if (
    sounds[currentIndex] !== undefined &&
    sounds[currentIndex] !== null &&
    typeof sounds[currentIndex] !== 'string' &&
    sounds[currentIndex].state() === 'loaded' &&
    sounds[currentIndex].playing() === false &&
    coolDown === 0 &&
    playingChorale === false
  ) {
    if (oldCurrentIndex !== currentIndex) {
      if (currentDestination === 'p' && backToInterior === true) {
        console.log('*** BACK TO INTERIOR ***');
        backToInterior = false;
        for (let k = currentIndex; k < sounds.length; k++) {
          if (partition[k] && history.indexOf(partition[k]._id) !== -1) {
            history.splice(history.indexOf(partition[k]._id), 1);
          }
          if (sounds[k] && typeof sounds[k].unload === 'function') {
            sounds[k].unload();
            sounds[k] = null;
          }
        }
        sounds.splice(currentIndex);
        soundsNext.splice(currentIndex);
        soundsDelay.splice(currentIndex);
        soundsFading.splice(currentIndex);
        partition.splice(currentIndex);
        getNext({
          destination: 'i',
        });
      } else if (currentDestination === 'i' && goToPublic === true) {
        console.log('*** GO TO PUBLIC ***');
        goToPublic = false;
        for (let k = currentIndex; k < sounds.length; k++) {
          if (partition[k] && history.indexOf(partition[k]._id) !== -1) {
            history.splice(history.indexOf(partition[k]._id), 1);
          }
          if (sounds[k] && typeof sounds[k].unload === 'function') {
            sounds[k].unload();
            sounds[k] = null;
          }
        }
        sounds.splice(currentIndex);
        soundsNext.splice(currentIndex);
        soundsDelay.splice(currentIndex);
        soundsFading.splice(currentIndex);
        partition.splice(currentIndex);
        getNext({
          destination: 'p',
        });
      } else if (partition[currentIndex]) {
        gotNext = false;
        console.log('Play', JSON.stringify(partition[currentIndex]._id));
        if (Array.isArray(partition[currentIndex].voice)) {
          currentVoice =
            partition[currentIndex].voice[
              partition[currentIndex].clips.indexOf(sounds[currentIndex]._src.replace('/runtime/', ''))
            ];
        } else {
          currentVoice = partition[currentIndex].voice;
        }
        if (!Array.isArray(partition[currentIndex].destination)) {
          currentDestination = partition[currentIndex].destination;
          $('#status').text(currentDestination === 'i' ? 'INTERIOR VOICE' : 'PUBLIC VOICE');
        }
        currentSubject = partition[currentIndex].subject;
        currentType = partition[currentIndex].type;
        let scoreChanged = false;
        if (currentType) {
          score[currentType]++;
          scoreChanged = true;
        }
        if (!Array.isArray(partition[currentIndex].tags)) {
          currentTag = [partition[currentIndex].tags];
        } else {
          currentTag = partition[currentIndex].tags;
        }
        for (let t = 0; t < currentTag.length; t++) {
          score[currentTag[t]]++;
          scoreChanged = true;
        }
        if (scoreChanged) {
          // console.log(JSON.stringify(score));
        }
        if (score['pessimist'] > 50 && launchingChorale === false) {
          launchingChorale = true;
          score.attack = 0;
          score.resist = 0;
          score.optimist = 0;
          score.pessimist = 0;
          score['complice+'] = 0;
          score['complice-'] = 0;
          score.empatic = 0;
          score.colere = 0;
          chorale();
        }
        inPartitionCount--;
        lastPlayedSound = new Date();
        sounds[currentIndex].play();
        sounds[currentIndex].fade(0, currentVoice === 'w' ? settings.whisperVolume : 1, settings.fadingDuration * 1000);
        oldCurrentIndex = currentIndex;
      } else {
        gotNext = false;
        console.log('*** WARNING *** Empty partition slot for index', currentIndex);
        $('#status').text(currentDestination === 'i' ? 'INTERIOR VOICE' : 'PUBLIC VOICE');
        let scoreChanged = false;
        if (currentType) {
          score[currentType]++;
          scoreChanged = true;
        }
        if (currentTag && Array.isArray(currentTag)) {
          for (let t = 0; t < currentTag.length; t++) {
            score[currentTag[t]]++;
            scoreChanged = true;
          }
        }
        if (scoreChanged) {
          // console.log(JSON.stringify(score));
        }
        if (score['pessimist'] > 50 && launchingChorale === false) {
          launchingChorale = true;
          score.attack = 0;
          score.resist = 0;
          score.optimist = 0;
          score.pessimist = 0;
          score['complice+'] = 0;
          score['complice-'] = 0;
          score.empatic = 0;
          score.colere = 0;
          chorale();
        }
        inPartitionCount--;
        lastPlayedSound = new Date();
        sounds[currentIndex].play();
        sounds[currentIndex].fade(0, currentVoice === 'w' ? settings.whisperVolume : 1, settings.fadingDuration * 1000);
        oldCurrentIndex = currentIndex;
      }
    }
  }

  for (let i = currentIndex; i < sounds.length; i++) {
    if (
      sounds[i] !== null &&
      typeof sounds[i] !== 'string' &&
      sounds[i].state() === 'loaded' &&
      sounds[i].playing() === true
    ) {
      lastPlayedSound = new Date();
      if (soundsFading[i] === false && sounds[i].seek() >= sounds[i].duration() - settings.fadingDuration) {
        soundsFading[i] = true;
        sounds[i].fade(currentVoice === 'w' ? settings.whisperVolume : 1, 0, settings.fadingDuration * 1000);
      }
      if (playingChorale === false) {
        if (sounds[i].seek() > 0 && gotNext === false && currentIndex + 1 === sounds.length) {
          gotNext = true;
          getNext();
        }
        if (soundsNext[i] === false && soundsDelay[currentIndex + 1] !== undefined) {
          if (
            soundsDelay[currentIndex + 1] < 0 &&
            sounds[i].seek() >= sounds[i].duration() + soundsDelay[currentIndex + 1]
          ) {
            soundsNext[i] = true;
            coolDown = 0;
            currentIndex++;
          }
          if (
            soundsDelay[currentIndex + 1] >= 0 &&
            sounds[i].seek() >= sounds[i].duration() - runtimeFrequency / 1000
          ) {
            soundsNext[i] = true;
            coolDown = soundsDelay[currentIndex + 1] * (1000 / runtimeFrequency);
            currentIndex++;
          }
        }
      }
    }
  }
}

function loadSound(filename, delay, isWhisper, forChorale) {
  // console.log('Load sound', filename, delay, isWhisper, forChorale);
  if (forChorale) {
    if (/^_\d+$/.test(filename) === false && filename !== 'pause') {
      setTimeout(
        () => {
          playingChorale = true;
          choraleCount++;
          new Howl({
            src: [`/runtime/${filename}`],
            preload: true,
            volume: isWhisper ? settings.whisperVolume : 1,
            autoplay: true,
            loop: false,
            onend: function () {
              choraleCount--;
              this.unload();
            },
          });
        },
        chance.integer({
          min: 0,
          max: 5,
        }) * 1000,
      );
    }
  } else {
    const _i = sounds.length;
    soundsFading[_i] = false;
    soundsNext[_i] = false;
    soundsDelay[_i] = delay;
    if (/^_\d+$/.test(filename) === false && filename !== 'pause') {
      sounds[_i] = new Howl({
        src: [`/runtime/${filename}`],
        preload: true,
        autoplay: false,
        loop: false,
        onend: () => {
          if (sounds[_i] && typeof sounds[_i].unload === 'function') {
            sounds[_i].unload();
            sounds[_i] = null;
          }
        },
      });
    } else if (/^_\d+$/.test(filename) === true || filename === 'pause') {
      if (filename === 'pause') {
        filename = '_10';
      }
      sounds[_i] = filename;
    }
  }
}
