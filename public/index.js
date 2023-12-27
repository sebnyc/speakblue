let socket;
let sounds = {};
let myUnsavedModal = null;
let myInProgressModal = null;
let addedPresets = [];
let addedPresetsData = {};
let text = '';
let clickedOnce = false;
let myID = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
let myUID;
let presetFilter = {
  filter: null,
  closed: [],
};
let filterTimeout;

const animateCSS = (element, animation, prefix = 'animate__') =>
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);
    node.classList.add(`${prefix}animated`, animationName);
    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName);
      resolve('Animation ended');
    }
    node.addEventListener('animationend', handleAnimationEnd, { once: true });
  });

$(document).ready(() => {
  myUID = Cookies.get('uid');

  if (Cookies.get('presetFilter')) {
    presetFilter = JSON.parse(Cookies.get('presetFilter'));
    $('#search').val(presetFilter.filter);
  }

  socket = io();

  socket.on('clip', (data) => {
    if (data && data.myID && `${data.myID}` === `${myID}`) {
      $(`#preset-play-${data.presetId}`).removeClass('btn-warning').addClass('btn-success').html('Jouer');
      $(`#preset-download-${data.presetId}`)
        .removeClass('btn-warning')
        .addClass('btn-success')
        .addClass('disabled')
        .attr('href', '#');
      sounds[data.presetId] = new Howl({
        src: [`/clips/${data.clipFileName}`],
        preload: true,
        autoplay: false,
        onload: function () {
          let filename = `${presets[data.presetId].name}-${data.presetId}`;
          filename = filename
            .replace(/[^a-z0-9-]/gim, '_')
            .replace(/_+/gim, '_')
            .toLowerCase();
          $('.preset-play').attr('disabled', false);
          $(`#preset-download-${data.presetId}`)
            .removeClass('disabled')
            .attr('download', `${filename}.wav`)
            .attr('href', sounds[data.presetId]._src);
          if (clickedOnce === true) {
            if (sounds[data.presetId].playing()) {
              sounds[data.presetId].stop();
            } else {
              sounds[data.presetId].play();
            }
          } else {
            animateCSS(`#preset-play-group-${data.presetId}`, 'shakeX');
          }
        },
      });
    }
  });

  if (Cookies.get('addedPresets')) {
    addedPresets = JSON.parse(Cookies.get('addedPresets'));
  }

  if (Cookies.get('addedPresetsData')) {
    addedPresetsData = JSON.parse(Cookies.get('addedPresetsData'));
  }

  if (Cookies.get('text')) {
    text = `${Cookies.get('text')}`.trim();
    $('#text').val(text);
    for (let i = 0; i < addedPresets.length; i++) {
      if (text) {
        $(`#preset-play-${addedPresets[i]}`).attr('disabled', false);
      } else {
        $(`#preset-play-${addedPresets[i]}`).attr('disabled', true);
      }
    }

    const sentenceCount = `${text}`
      .trim()
      .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
      .split(/\w[.?!](\s|$)/)
      .filter((n) => n && /\w+/gim.test(n));
    const wordCount = `${text}`
      .trim()
      .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
      .split(/\W/)
      .filter((n) => n && /\w+/gim.test(n));
    const signCount = `${text}`
      .trim()
      .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
      .split(/\W/)
      .filter((n) => n && /\w+/gim.test(n))
      .join(' ');

    $('#counter').text(
      `${sentenceCount.length} phrase${sentenceCount.length > 1 ? 's' : ''} - ${wordCount.length} mot${
        wordCount.length > 1 ? 's' : ''
      } - ${signCount.length} signe${signCount.length > 1 ? 's' : ''}`,
    );
  }

  $(document).on('input', '#text', function (e) {
    setText();
  });

  $(document).on('click', '#text-copy', function (e) {
    const copyTextarea = document.querySelector('#text');
    copyTextarea.focus();
    copyTextarea.select();
    try {
      document.execCommand('copy');
    } catch (ignore) {}
  });

  $(document).on('click', '#text-paste', function (e) {
    const copyTextarea = document.querySelector('#text');
    copyTextarea.focus();
    copyTextarea.select();
    try {
      document.execCommand('paste');
    } catch (ignore) {}
  });

  $(document).on('click', '.preset-item', function (e) {
    if (!dupClicked && !supClicked) {
      const target = $(e.currentTarget);
      addPreset(target.attr('id'));
    } else {
      dupClicked = false;
      supClicked = false;
    }
  });

  $(document).on('click', '#new-preset', function (e) {
    let now = new Date();
    let id = `new_${now.getTime()}`;
    presets[id] = {
      _id: id,
      name: '',
      voice: 'natural',
      pitch: 3,
      volume: 3,
      rate: 100,
      tags: [],
      locked: false,
      fav: false,
      creator: Cookies.get('uid'),
    };
    addPreset(id);
  });

  $(document).on('input', '#search', function (e) {
    clearTimeout(filterTimeout);
    const target = $(e.currentTarget);
    const text = $(target).val().trim();
    filterTimeout = setTimeout(() => {
      doSearch(text);
    }, 500);
  });

  $(document).on('click', '#button-search', function (e) {
    clearTimeout(filterTimeout);
    doSearch($('#search').val().trim());
  });

  $(document).on('click', '.open-close', function (e) {
    const target = $(e.currentTarget).parent();
    const match = /^(\w+)$/.exec(target.attr('id'));
    if (match && match[1]) {
      if (presetFilter.closed.indexOf(match[1]) !== -1) {
        presetFilter.closed = presetFilter.closed.filter((item) => {
          return item !== match[1];
        });
      } else {
        presetFilter.closed.push(match[1]);
      }
      Cookies.set('presetFilter', JSON.stringify(presetFilter), { expires: 365 });
      loadPresets(function (err) {
        $('.actual-preset').remove();
        for (let i = 0; i < addedPresets.length; i++) {
          reopenPreset(addedPresets[i]);
        }
      });
    }
  });

  $(document).on('click', '.sup', function (e) {
    const target = $(e.currentTarget).parent();
    const match = /^(\w+)$/.exec(target.attr('id'));
    if (match && match[1]) {
      supClicked = true;
      dupClicked = false;

      if (window.confirm('Supprimer le preset ?')) {
        if (myInProgressModal !== null) {
          myInProgressModal.show();
        }

        $.post('/sup', {
          id: match[1],
          myUID: myUID,
        })
          .done(function (result) {
            loadPresets(function (err) {
              $('.actual-preset').remove();
              for (let i = 0; i < addedPresets.length; i++) {
                reopenPreset(addedPresets[i]);
              }
              setTimeout(function () {
                myInProgressModal.hide();
              }, 1000);
            });
          })
          .fail(function () {
            setTimeout(function () {
              myInProgressModal.hide();
            }, 1000);
          });
      }
    }
  });

  $(document).on('click', '.dup', function (e) {
    const target = $(e.currentTarget).parent();
    const match = /^(\w+)$/.exec(target.attr('id'));
    if (match && match[1]) {
      supClicked = false;
      dupClicked = true;

      if (myInProgressModal !== null) {
        myInProgressModal.show();
      }

      $.post('/dup', {
        id: match[1],
        myUID: myUID,
      })
        .done(function (result) {
          loadPresets(function (err) {
            $('.actual-preset').remove();
            for (let i = 0; i < addedPresets.length; i++) {
              reopenPreset(addedPresets[i]);
            }
            setTimeout(function () {
              myInProgressModal.hide();
            }, 1000);
          });
        })
        .fail(function () {
          setTimeout(function () {
            myInProgressModal.hide();
          }, 1000);
        });
    }
  });

  myUnsavedModal = new bootstrap.Modal(document.getElementById('myUnsavedModal'));
  myInProgressModal = new bootstrap.Modal(document.getElementById('myInProgressModal'));

  loadPresets(function (err) {
    for (let i = 0; i < addedPresets.length; i++) {
      reopenPreset(addedPresets[i]);
    }
  });
});

function doSearch(text) {
  presetFilter.filter = text;
  Cookies.set('presetFilter', JSON.stringify(presetFilter), { expires: 365 });
  loadPresets(function (err) {
    $('.actual-preset').remove();
    for (let i = 0; i < addedPresets.length; i++) {
      reopenPreset(addedPresets[i]);
    }
  });
}

function setText() {
  text = `${$('#text').val()}`.trim();
  Cookies.set('text', text, { expires: 365 });

  const sentenceCount = `${text}`
    .trim()
    .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
    .split(/\w[.?!](\s|$)/)
    .filter((n) => n && /\w+/gim.test(n));
  const wordCount = `${text}`
    .trim()
    .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
    .split(/\W/)
    .filter((n) => n && /\w+/gim.test(n));
  const signCount = `${text}`
    .trim()
    .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
    .split(/\W/)
    .filter((n) => n && /\w+/gim.test(n))
    .join(' ');

  $('#counter').text(
    `${sentenceCount.length} phrase${sentenceCount.length > 1 ? 's' : ''} - ${wordCount.length} mot${
      wordCount.length > 1 ? 's' : ''
    } - ${signCount.length} signe${signCount.length > 1 ? 's' : ''}`,
  );

  for (let i = 0; i < addedPresets.length; i++) {
    if (
      sounds[addedPresets[i]] !== undefined &&
      sounds[addedPresets[i]] !== null &&
      typeof sounds[addedPresets[i]].play === 'function'
    ) {
      delete sounds[addedPresets[i]];
      $(`#preset-play-${addedPresets[i]}`).removeClass('btn-success').addClass('btn-warning').html('Jouer');
      $(`#preset-download-${addedPresets[i]}`)
        .removeClass('btn-success')
        .addClass('btn-warning')
        .addClass('disabled')
        .attr('href', '#');
    }

    if (text) {
      $(`#preset-play-${addedPresets[i]}`).attr('disabled', false);
    } else {
      $(`#preset-play-${addedPresets[i]}`).attr('disabled', true);
    }
  }
}
