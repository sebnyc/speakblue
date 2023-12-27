const sounds = [];
const soundsNext = [];
const soundsDelay = [];
const soundsFading = [];
const fadingDuration = 125;
const runtimeFrequency = 50;
const history = [];
const currentPartition = [];
const currentTexts = [];
const currentIds = [];
const prefix = ''; //'http://io-io-io.io:3200';

let silenceTimeout = null;
let runtimeInterval = null;
let currentIndex = 0;
let oldCurrentIndex = -1;
let coolDown = 0;

function copyTextToClipboard(text) {
  var textArea = document.createElement('textarea');
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = 0;
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (ignore) {}
  document.body.removeChild(textArea);
}

function addBlock(e, voice) {
  let label;
  let shortClass;
  const request = {
    destination: undefined,
    voice: voice,
    subject: undefined,
    type: undefined,
    sb: false,
  };
  switch (voice) {
    case 'w':
      shortClass = 'primary';
      break;
    case 'n':
      shortClass = 'danger';
      break;
    case 'i':
      shortClass = 'success';
      break;
    case 'e':
      shortClass = 'warning';
      break;
    case '_':
      shortClass = 'info';
      break;
    case 'sb':
      shortClass = 'dark';
      request.sb = true;
      break;
  }
  if (shortClass === 'info') {
    request.destination = '*';
    label = $(e.target).siblings('.btn-light').text();
  } else if (shortClass === 'dark') {
    request.destination = 'sb';
    label = $(e.target).text();
  } else {
    if ($(e.target).parents('.list-group').hasClass('interior')) {
      request.destination = 'i';
      label = $(e.target).siblings('.btn-light').text();
    } else {
      request.destination = 'p';
      label = $(e.target).siblings('.btn-secondary').text();
    }
  }

  if (/\s/.test(label)) {
    request.subject = label.split(' ')[0];
    request.type = label.split(' ')[1];
  } else {
    request.subject = label;
  }
  if (request.type === undefined) {
    delete request.type;
  }
  let short = request.destination;
  if (request.subject) {
    short += '_' + request.subject;
  }
  if (request.type) {
    short += '_' + request.type;
  }
  if (shortClass !== 'info' && shortClass !== 'dark') {
    short += '_' + request.voice;
  }
  short = short.replace('*_', '');
  $(
    `<span class="badge bg-${shortClass} ${request.destination}" data-request='${JSON.stringify(
      request,
    )}'>${short}</span>`,
  ).appendTo('#partition');
}

function addBlockFromText(str) {
  str = `${str}`.toLocaleLowerCase();
  let shortClass;
  let voice;
  let id = undefined;
  let parts = str.split('_');
  let destination = parts[0];
  let subject;
  let type = undefined;
  if (str === 'silence') {
    destination = '*';
    voice = '_';
    subject = 'silence';
  } else if (/_\d+$/.test(str)) {
    id = str;
    voice = parts[parts.length - 2];
    if (parts.length === 5) {
      subject = parts[1];
      type = parts[2];
    } else {
      subject = parts[1];
    }
  } else {
    voice = parts[parts.length - 1];
    if (parts.length === 4) {
      subject = parts[1];
      type = parts[2];
    } else {
      subject = parts[1];
    }
  }
  const request = {
    destination: destination,
    voice: voice,
    subject: subject,
    type: type,
    id: id,
  };
  switch (voice) {
    case 'w':
      shortClass = 'primary';
      break;
    case 'n':
      shortClass = 'danger';
      break;
    case 'i':
      shortClass = 'success';
      break;
    case 'e':
      shortClass = 'warning';
      break;
    case '_':
      shortClass = 'info';
      break;
  }
  if (request.type === undefined) {
    delete request.type;
  }
  if (request.id === undefined) {
    delete request.id;
  }
  let short = str;
  $(
    `<span class="badge bg-${shortClass} ${request.destination}" data-request='${JSON.stringify(
      request,
    )}'>${short}</span>`,
  ).appendTo('#partition');
}

function reset() {
  clearInterval(runtimeInterval);
  clearTimeout(silenceTimeout);
  runtimeInterval = setInterval(runtime, runtimeFrequency);
  Howler.unload();
  sounds.splice(0, sounds.length);
  soundsNext.splice(0, soundsNext.length);
  soundsDelay.splice(0, soundsDelay.length);
  soundsFading.splice(0, soundsFading.length);
  currentPartition.splice(0, currentPartition.length);
  currentTexts.splice(0, currentTexts.length);
  currentIds.splice(0, currentIds.length);
  currentIndex = 0;
  oldCurrentIndex = -1;
  coolDown = 0;
  $('#copyi').attr('disabled', true);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

$(document).ready(() => {
  $('#overlay').show();
  $.post(`${prefix}/blocs`, {})
    .done(function (res) {
      $('#overlay').hide();
      if (res.done && res.blocs) {
        let ib = {};
        let pb = {};
        let sb = {};
        for (let i = 0; i < res.blocs.length; i++) {
          if (/^\w?i\w?_/i.test(res.blocs[i]._id)) {
            let _id = res.blocs[i]._id.replace(/^\w?i\w?_/i, 'i_').replace(/_\d+$/i, '');
            let _key = _id.split('_');
            _key.pop();
            _key.shift();
            _key = _key.join(' ');
            if (ib[_key] === undefined) {
              ib[_key] = {
                voices: [],
                blocs: [],
              };
            }
            if (/_\w?n\w?$/i.test(_id) && ib[_key].voices.indexOf('n') === -1) {
              ib[_key].voices.push('n');
            }
            if (/_\w?w\w?$/i.test(_id) && ib[_key].voices.indexOf('w') === -1) {
              ib[_key].voices.push('w');
            }
            if (/_\w?e\w?$/i.test(_id) && ib[_key].voices.indexOf('e') === -1) {
              ib[_key].voices.push('e');
            }
            if (/_\w?i\w?$/i.test(_id) && ib[_key].voices.indexOf('i') === -1) {
              ib[_key].voices.push('i');
            }
            if (ib[_key].blocs.indexOf(res.blocs[i]._id) === -1) {
              ib[_key].blocs.push(res.blocs[i]._id);
            }
          }
          if (/^\w?p\w?_/i.test(res.blocs[i]._id)) {
            let _id = res.blocs[i]._id.replace(/^\w?p\w?_/i, 'p_').replace(/_\d+$/i, '');
            let _key = _id.split('_');
            _key.pop();
            _key.shift();
            _key = _key.join(' ');
            if (pb[_key] === undefined) {
              pb[_key] = {
                voices: [],
                blocs: [],
              };
            }
            if (/_\w?n\w?$/i.test(_id) && pb[_key].voices.indexOf('n') === -1) {
              pb[_key].voices.push('n');
            }
            if (/_\w?w\w?$/i.test(_id) && pb[_key].voices.indexOf('w') === -1) {
              pb[_key].voices.push('w');
            }
            if (/_\w?e\w?$/i.test(_id) && pb[_key].voices.indexOf('e') === -1) {
              pb[_key].voices.push('e');
            }
            if (/_\w?i\w?$/i.test(_id) && pb[_key].voices.indexOf('i') === -1) {
              pb[_key].voices.push('i');
            }
            if (pb[_key].blocs.indexOf(res.blocs[i]._id) === -1) {
              pb[_key].blocs.push(res.blocs[i]._id);
            }
          }
          if (/^sb_/i.test(res.blocs[i]._id)) {
            let _id = res.blocs[i]._id.replace(/^sb_/i, '').replace(/_\d+$/i, '');
            let _key = _id;
            if (sb[_key] === undefined) {
              sb[_key] = {
                blocs: [],
              };
            }
            if (sb[_key].blocs.indexOf(res.blocs[i]._id) === -1) {
              sb[_key].blocs.push(res.blocs[i]._id);
            }
          }
        }
        let countib = Object.keys(ib).length;
        let countpb = Object.keys(pb).length;
        let countsb = Object.keys(sb).length;
        let count = Math.max(countib, countpb, countsb);

        ib = Object.keys(ib)
          .sort()
          .reduce((obj, key) => {
            obj[key] = ib[key];
            return obj;
          }, {});

        let index = 0;
        let secondColEmpty = true;
        for (let key in ib) {
          let button = `<div class="btn-group btn-group-sm me-1 mb-1" role="group"><button type="button" class="btn btn-light" disabled>${key}</button>`;
          if (ib[key].voices.indexOf('w') !== -1) {
            button = `${button}<button type="button" class="btn btn-primary">W</button>`;
          }
          if (ib[key].voices.indexOf('n') !== -1) {
            button = `${button}<button type="button" class="btn btn-danger">N</button>`;
          }
          if (ib[key].voices.indexOf('e') !== -1) {
            button = `${button}<button type="button" class="btn btn-warning">E</button>`;
          }
          if (ib[key].voices.indexOf('i') !== -1) {
            button = `${button}<button type="button" class="btn btn-success">I</button>`;
          }
          button = `${button}</div>`;
          if (index < count / 2) {
            $(button).insertBefore('h6.misc');
          } else {
            secondColEmpty = false;
            $(button).appendTo('div.interior2');
          }
          index++;
        }

        if (secondColEmpty === true) {
          $('div.interior2').parent().remove();
        }

        pb = Object.keys(pb)
          .sort()
          .reduce((obj, key) => {
            obj[key] = pb[key];
            return obj;
          }, {});

        index = 0;
        secondColEmpty = true;
        for (let key in pb) {
          let button = `<div class="btn-group btn-group-sm me-1 mb-1" role="group"><button type="button" class="btn btn-secondary" disabled>${key}</button>`;
          if (pb[key].voices.indexOf('w') !== -1) {
            button = `${button}<button type="button" class="btn btn-primary">W</button>`;
          }
          if (pb[key].voices.indexOf('n') !== -1) {
            button = `${button}<button type="button" class="btn btn-danger">N</button>`;
          }
          if (pb[key].voices.indexOf('e') !== -1) {
            button = `${button}<button type="button" class="btn btn-warning">E</button>`;
          }
          if (pb[key].voices.indexOf('i') !== -1) {
            button = `${button}<button type="button" class="btn btn-success">I</button>`;
          }
          button = `${button}</div>`;
          if (index < count / 2) {
            $(button).appendTo('div.public');
          } else {
            secondColEmpty = false;
            $(button).appendTo('div.public2');
          }
          index++;
        }

        if (secondColEmpty === true) {
          $('div.public2').parent().remove();
        }

        sb = Object.keys(sb)
          .sort()
          .reduce((obj, key) => {
            obj[key] = sb[key];
            return obj;
          }, {});

        index = 0;
        secondColEmpty = true;
        for (let key in sb) {
          let button = `<div class="btn-group btn-group-sm me-1 mb-1" role="group"><button type="button" class="btn btn-${
            /^i_/.test(key) ? 'secondary' : 'dark'
          }">${key}</button>`;
          button = `${button}</div>`;
          if (index < count / 2) {
            $(button).appendTo('div.sb');
          } else {
            secondColEmpty = false;
            $(button).appendTo('div.sb2');
          }
          index++;
        }

        if (secondColEmpty === true) {
          $('div.sb2').parent().remove();
        }
      }
    })
    .fail(function () {
      $('#overlay').hide();
    });

  $(document).on('click', '.btn-primary', (e) => {
    addBlock(e, 'w');
  });
  $(document).on('click', '.btn-danger', (e) => {
    addBlock(e, 'n');
  });
  $(document).on('click', '.btn-warning', (e) => {
    addBlock(e, 'e');
  });
  $(document).on('click', '.btn-success', (e) => {
    addBlock(e, 'i');
  });
  $(document).on('click', '.btn-info', (e) => {
    addBlock(e, '_');
  });
  $(document).on('click', '.btn-dark', (e) => {
    addBlock(e, 'sb');
  });
  $(document).on('click', '.btn-secondary', (e) => {
    addBlock(e, 'sb');
  });
  $('#replay').on('click', () => {
    clearInterval(runtimeInterval);
    clearTimeout(silenceTimeout);
    runtimeInterval = setInterval(runtime, runtimeFrequency);
    Howler.stop();
    currentIndex = 0;
    oldCurrentIndex = -1;
    coolDown = 0;
    for (let i = 0; i < sounds.length; i++) {
      soundsFading[i] = false;
      soundsNext[i] = false;
    }
  });
  $('#apply').on('click', () => {
    let input = $('#input').val().trim();
    $('#partition').empty();
    reset();
    if (/\[\[/.test(input) && /\]\]/.test(input)) {
      input = input.replace(/\[\[/gm, '∂');
      input = input.replace(/\]\]/gm, 'ß');
      input = input.replace(/:∂[^ß]+ß/gm, '');
      input = input.replace(/:∂ß/gm, '');
      input.split(',').forEach((item) => {
        addBlockFromText(item);
      });
    } else {
      input.split(',').forEach((item) => {
        addBlockFromText(item);
      });
    }
  });
  $('#play').on('click', () => {
    reset();
    const partition = [];
    $('#partition > .badge').each((index, item) => {
      partition.push($(item).data('request'));
    });
    const tags = [];
    $('input[type=checkbox]:checked').each((index, item) => {
      tags.push($(item).val());
    });
    console.log('partition', partition);
    console.log('tags', tags);
    $.post(`${prefix}/partition`, {
      partition: partition,
      history: history,
      tags: tags,
    })
      .done(function (res) {
        if (res.done && res.clips) {
          $('#copyi').attr('disabled', false);
          res.clips.forEach((clip) => {
            console.log('got', clip._id);
            currentPartition.push(clip._id);
            currentTexts.push(clip.text);
            currentIds.push(clip._id);
            if (clip._id !== 'silence') {
              history.push(clip._id);
            }
            loadSound(clip.clip, 0.25);
          });
        }
      })
      .fail(function () {});
  });
  $('#stop').on('click', () => {
    reset();
  });
  $('#copy').on('click', () => {
    const partition = [];
    $('#partition > .badge').each((index, value) => {
      const dt = $(value).data('request');
      if (dt.destination === '*') {
        partition.push(`${dt.subject}`);
      } else if (dt.sb) {
        partition.push(`${dt.destination}_${dt.subject}`);
      } else if (dt.type) {
        partition.push(`${dt.destination}_${dt.subject}_${dt.type}_${dt.voice}`);
      } else {
        partition.push(`${dt.destination}_${dt.subject}_${dt.voice}`);
      }
    });
    copyTextToClipboard(partition.join(','));
  });
  $('#copyi').on('click', () => {
    const partition = [];
    for (let index = 0; index < currentIds.length; index++) {
      if (currentIds[index] === currentTexts[index]) {
        partition.push(`${currentIds[index]}:[[]]`);
      } else {
        partition.push(`${currentIds[index]}:[[${currentTexts[index]}]]`);
      }
    }
    copyTextToClipboard(partition.join(','));
  });
  $('#delete').on('click', () => {
    $('#partition').empty();
    reset();
  });

  runtimeInterval = setInterval(runtime, runtimeFrequency);
});

function runtime() {
  if (coolDown > 0) {
    coolDown--;
  }

  if (sounds[currentIndex] === '_') {
    console.log('pause');
    clearInterval(runtimeInterval);
    clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(() => {
      soundsNext[currentIndex] = true;
      coolDown = 0;
      currentIndex++;
      runtimeInterval = setInterval(runtime, runtimeFrequency);
    }, 10 * 1000);
  }

  if (
    sounds[currentIndex] !== undefined &&
    sounds[currentIndex] !== null &&
    sounds[currentIndex] !== '_' &&
    sounds[currentIndex].state() === 'loaded' &&
    sounds[currentIndex].playing() === false &&
    coolDown === 0
  ) {
    if (oldCurrentIndex !== currentIndex) {
      console.log('play', currentIds[currentIndex]);
      sounds[currentIndex].play();
      sounds[currentIndex].fade(0, 1, fadingDuration);
      oldCurrentIndex = currentIndex;
    }
  }

  for (let i = currentIndex; i < sounds.length; i++) {
    if (sounds[i] !== null && sounds[i] !== '_' && sounds[i].state() === 'loaded' && sounds[i].playing() === true) {
      if (soundsFading[i] === false && sounds[i].seek() >= sounds[i].duration() - fadingDuration / 1000) {
        soundsFading[i] = true;
        sounds[i].fade(1, 0, fadingDuration);
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
        if (soundsDelay[currentIndex + 1] >= 0 && sounds[i].seek() >= sounds[i].duration() - runtimeFrequency / 1000) {
          soundsNext[i] = true;
          coolDown = soundsDelay[currentIndex + 1] * (1000 / runtimeFrequency);
          currentIndex++;
        }
      }
    }
  }
}

function loadSound(filename, delay) {
  const _i = sounds.length;
  soundsFading[_i] = false;
  soundsNext[_i] = false;
  soundsDelay[_i] = delay;
  if (filename !== '_' && filename !== 'pause') {
    sounds[_i] = new Howl({
      src: [`${prefix}/runtime/${filename}`],
      preload: true,
      autoplay: false,
      loop: false,
    });
  } else {
    sounds[_i] = '_';
  }
}
