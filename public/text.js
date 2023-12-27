let socket;
let sound = null;
let myUnsavedModal = null;
let myInProgressModal = null;
let myAnonymousModal = null;
let clickedOnce = false;
let myID = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));
let myUID;
let textFilter = {
  filter: null,
  closed: [],
};
let filterTimeout;

let textData = null;
let texts = {};
let preventLoop = false;
let supClicked = false;
let dupClicked = false;
let openNext = null;
let isAnonymous = true;
let isAdmin = false;

const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

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

  if (Cookies.get('isadmin') === true || Cookies.get('isadmin') === 'true') {
    isAdmin = true;
  } else {
    isAdmin = false;
  }

  if (Cookies.get('anonymous') === true || Cookies.get('anonymous') === 'true') {
    isAnonymous = true;
  } else {
    isAnonymous = false;
  }

  if (!myUID) {
    Cookies.remove('uid');
    Cookies.remove('isadmin');
    Cookies.remove('username');
    Cookies.remove('textFilter');
    Cookies.remove('textdata');
    Cookies.set('anonymous', true);
    isAdmin = false;
    isAnonymous = true;
  }

  if (isAnonymous === false) {
    $('title').text(`#SpeakBlue - édition des textes de ${Cookies.get('username')}`);
    $('#username').text(`- édition des textes de ${Cookies.get('username')}`);
    if (isAdmin) {
      $('#username').text($('#username').text() + ' (admin)');
    }

    if (Cookies.get('textFilter')) {
      textFilter = JSON.parse(Cookies.get('textFilter'));
      $('#search').val(textFilter.filter);
    }

    $(document).on('click', '.text-item', function (e) {
      if (!dupClicked && !supClicked) {
        const target = $(e.currentTarget);
        if (myUnsavedModal !== null && target.attr('id') !== textData.id && textData.dirty) {
          $('.text-save-and-close').data('text-id', target.attr('id'));
          if (textData.creator === myUID || isAdmin) {
            $(`.text-save-and-close`).attr('disabled', false);
          } else {
            $(`.text-save-and-close`).attr('disabled', true);
          }
          myUnsavedModal.show();
        } else {
          openText(texts[target.attr('id')]);
        }
      } else {
        dupClicked = false;
        supClicked = false;
      }
    });

    $(document).on('click', '.sup', function (e) {
      const target = $(e.currentTarget).parent();
      const match = /^(\w+)$/.exec(target.attr('id'));
      if (match && match[1]) {
        supClicked = true;
        dupClicked = false;

        if (window.confirm('Supprimer le texte ?')) {
          if (myInProgressModal !== null) {
            myInProgressModal.show();
          }

          $.post('/suptext', {
            id: match[1],
            myUID: myUID,
          })
            .done(function (result) {
              loadTexts(function (err) {
                if (textData.id === match[1]) {
                  let now = new Date();
                  textData.id = `new_${now.getTime()}`;
                  textData.dirty = true;
                  textData.initData = { title: '', text: '', tags: [], published: false };
                  textData.published = false;
                  textData.locked = false;
                  addText();
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

        $.post('/duptext', {
          id: match[1],
          myUID: myUID,
        })
          .done(function (result) {
            loadTexts(function (err) {
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

    $(document).on('click', '#text-publish', function (e) {
      publishText();
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
        if (textFilter.closed.indexOf(match[1]) !== -1) {
          textFilter.closed = textFilter.closed.filter((item) => {
            return item !== match[1];
          });
        } else {
          textFilter.closed.push(match[1]);
        }
        Cookies.set('textFilter', JSON.stringify(textFilter), { expires: 365 });
        loadTexts(function (err) {});
      }
    });

    $('#list-col').removeClass('invisible');

    loadTexts(function (err) {});
  } else {
    $('title').text("#SpeakBlue - saisie d'un texte anonyme");
    $('#username').text("- saisie d'un texte anonyme");
    $(document).on('input', '#nom', function (e) {
      checkNameEmail();
    });
    $(document).on('input', '#email', function (e) {
      checkNameEmail();
    });

    $(document).on('click', '.text-anonymous-save', function (e) {
      saveAnonymousText();
    });

    $(document).on('click', '.text-authenticated-save', function (e) {
      saveAuthenticatedText();
    });
  }

  if (isAdmin === true) {
    $('#text-addtag').attr('disabled', false);
  }

  socket = io();

  $(document).on('click', '#new-text', function (e) {
    if (myUnsavedModal !== null && textData.dirty && !isAnonymous) {
      $('.text-save-and-close').data('text-id', null);
      if (textData.creator === myUID || isAdmin) {
        $(`.text-save-and-close`).attr('disabled', false);
      } else {
        $(`.text-save-and-close`).attr('disabled', true);
      }
      myUnsavedModal.show();
    } else {
      let now = new Date();
      textData = {
        id: `new_${now.getTime()}`,
        dirty: false,
        initData: { title: '', text: '', tags: [], published: false },
        currentData: { title: '', text: '', tags: [], published: false },
        published: false,
        locked: false,
        creator: Cookies.get('uid'),
      };
      addText();
    }
  });

  socket.on('clip', (data) => {
    if (data && data.myID && `${data.myID}` === `${myID}`) {
      $(`#text-play`).removeClass('btn-warning').addClass('btn-success').html('Jouer');
      $(`#text-download`).removeClass('btn-warning').addClass('btn-success').addClass('disabled').attr('href', '#');
      sound = new Howl({
        src: [`/clips/${data.clipFileName}`],
        preload: true,
        autoplay: false,
        onload: function () {
          let filename = `${textData.currentData.title}-${textData.id}`;
          filename = filename
            .replace(/[^a-z0-9-]/gim, '_')
            .replace(/_+/gim, '_')
            .toLowerCase();
          $(`#text-play`).attr('disabled', false);
          $(`#text-download`).removeClass('disabled').attr('download', `${filename}.wav`).attr('href', sound._src);
          if (clickedOnce === true) {
            if (sound.playing()) {
              sound.stop();
            } else {
              sound.play();
            }
          } else {
            animateCSS(`#text-play-group`, 'shakeX');
          }
        },
      });
    }
  });

  if (Cookies.get('textdata')) {
    textData = JSON.parse(Cookies.get('textdata'));
  } else {
    let now = new Date();
    textData = {
      id: `new_${now.getTime()}`,
      dirty: false,
      initData: { title: '', text: '', tags: [], published: false },
      currentData: { title: '', text: '', tags: [], published: false },
      published: false,
      locked: false,
      creator: Cookies.get('uid'),
    };
  }
  addText();

  $(document).on('input', '#text', function (e) {
    modifyText('text', `${$('#text').val()}`.trim());
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

  $(document).on('click', '.text-save-and-close', function (e) {
    textSaveAndClose($('.text-save-and-close').data('text-id'));
  });

  $(document).on('click', '.text-force-close', function (e) {
    textForceClose($('.text-save-and-close').data('text-id'));
  });

  $(document).on('input', '#text-title', function (e) {
    modifyText('title', `${$('#text-title').val()}`.trim());
  });

  $(document).on('click', '#text-play', function (e) {
    if (sound !== undefined && sound !== null && typeof sound.play === 'function') {
      clickedOnce = true;
      if (sound.playing()) {
        sound.stop();
      } else {
        sound.play();
      }
    } else {
      play();
    }
  });

  $(document).on('click', '#text-save', function (e) {
    saveText();
  });

  $(document).on('click', '.text-removetag', function (e) {
    if (textData.creator === myUID || isAdmin) {
      const tag = $(e.currentTarget).parent('.text-actual-tag').text();
      $(e.currentTarget).parent('.text-actual-tag').remove();
      removeTag(tag);
    }
  });

  $(document).on('click', '#text-addtag', function (e) {
    if (textData.creator === myUID || isAdmin) {
      const tag = window.prompt('Ajouter un tag :', '');
      if (tag && `${tag}`.toLowerCase().trim()) {
        addTag(`${tag}`.toLowerCase().trim());
      }
    }
  });

  myUnsavedModal = new bootstrap.Modal(document.getElementById('myUnsavedModal'));
  myInProgressModal = new bootstrap.Modal(document.getElementById('myInProgressModal'));
  myAnonymousModal = new bootstrap.Modal(document.getElementById('myAnonymousModal'));
});

function modifyText(name, value) {
  if (preventLoop === true) {
    return;
  }

  preventLoop = true;

  textData.currentData[name] = value;

  const sentenceCount = `${textData.currentData.text}`
    .trim()
    .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
    .split(/\w[.?!](\s|$)/)
    .filter((n) => n && /\w+/gim.test(n));
  const wordCount = `${textData.currentData.text}`
    .trim()
    .replace(/[àâäêëéèìîïôöòùûÿœæç]/gim, 'a')
    .split(/\W/)
    .filter((n) => n && /\w+/gim.test(n));
  const signCount = `${textData.currentData.text}`
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

  if (
    JSON.stringify(textData.currentData.title) !== JSON.stringify(textData.initData.title) ||
    JSON.stringify(textData.currentData.text) !== JSON.stringify(textData.initData.text)
  ) {
    textData.dirty = true;
    textData.published = false;

    if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (isAnonymous || textData.creator === myUID || isAdmin)
    ) {
      $(`#text-save`).attr('disabled', false);
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }
    } else {
      $(`#text-save`).attr('disabled', true);
      $(`#text-publish`).attr('disabled', true);
    }

    if (isAnonymous) {
      $(`#text-publish`).attr('disabled', true);
    }

    if (sound !== undefined && sound !== null && typeof sound.play === 'function') {
      sound.unload();
      sound = null;
      $(`#text-play`).removeClass('btn-success').addClass('btn-warning').html('Jouer');
      $(`#text-download`).removeClass('btn-success').addClass('btn-warning').addClass('disabled').attr('href', '#');
    }
  } else {
    textData.dirty = false;
    textData.published = textData.initData.published;
    $(`#text-save`).attr('disabled', true);
    if (textData.published) {
      $(`#text-publish`).attr('disabled', true);
    } else if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (isAnonymous || textData.creator === myUID || isAdmin)
    ) {
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }
    }

    if (isAnonymous) {
      $(`#text-publish`).attr('disabled', true);
    }
  }

  Cookies.set('textdata', JSON.stringify(textData), { expires: 365 });

  if (textData.currentData.text) {
    $(`#text-play`).attr('disabled', false);
  } else {
    $(`#text-play`).attr('disabled', true);
  }

  preventLoop = false;
}

function addText() {
  Cookies.set('textdata', JSON.stringify(textData), { expires: 365 });
  $('#text-title').val(textData.currentData.title);
  $('#text').val(textData.currentData.text);
  $('.text-actual-tag').remove();
  if (Array.isArray(textData.currentData.tags)) {
    for (let i = 0; i < textData.currentData.tags.length; i++) {
      $(
        `<span class='text-tag text-actual-tag badge bg-dark text-light mb-1'>${textData.currentData.tags[i]}<button type='button' class='text-removetag btn-close btn-close-white ms-1'></button></span>`,
      ).insertBefore(`#text-emptytag`);
    }
  }
  if (sound !== undefined && sound !== null && typeof sound.play === 'function') {
    sound.unload();
    sound = null;
    $(`#text-play`).removeClass('btn-success').addClass('btn-warning').html('Jouer');
    $(`#text-download`).removeClass('btn-success').addClass('btn-warning').addClass('disabled').attr('href', '#');
  }
  modifyText('text', textData.currentData.text);
}

function loadTexts(cb) {
  $.get('/texts')
    .done(function (data) {
      texts = {};
      $('#text-list').empty();
      if (data && Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].texts.length; j++) {
            texts[data[i].texts[j]._id] = data[i].texts[j];
          }
          if (textFilter.closed.indexOf(data[i].id) === -1) {
            if (textFilter.filter) {
              data[i].texts = data[i].texts.filter((item) => {
                let hasTag = false;
                if (Array.isArray(item.tags) && item.tags.length > 0) {
                  for (let k = 0; k < item.tags.length; k++) {
                    if (`${item.tags[k]}`.toLowerCase().indexOf(`${textFilter.filter}`.toLowerCase()) !== -1) {
                      hasTag = true;
                      break;
                    }
                  }
                }
                return hasTag || `${item.title}`.toLowerCase().indexOf(`${textFilter.filter}`.toLowerCase()) !== -1;
              });
            }
            if (data[i].texts.length > 0) {
              let deletable = false;
              if (data[i].id === myUID || isAdmin) {
                $(
                  `<h6 id="${data[i].id}" class="current">${data[i].name}&nbsp;<i class="bi bi-eye open-close"></i></h6>`,
                ).appendTo('#text-list');
                deletable = true;
              } else {
                $(`<h6 id="${data[i].id}">${data[i].name}&nbsp;<i class="bi bi-eye open-close"></i></h6>`).appendTo(
                  '#text-list',
                );
              }
              for (let j = 0; j < data[i].texts.length; j++) {
                let summary = '';
                if (Array.isArray(data[i].texts[j].tags) && data[i].texts[j].tags.length > 0) {
                  summary += `<br><small class="tags badge badge-secondary">${data[i].texts[j].tags.join(
                    '</small><small class="tags badge badge-secondary">',
                  )}</small>`;
                }
                if (deletable) {
                  if (data[i].texts[j].published) {
                    $(
                      `<a href="#" id="${data[i].texts[j]._id}" class="text-item list-group-item list-group-item-action">${data[i].texts[j].title}&nbsp;<i class="bi bi-star-fill text-warning"></i><i class="bi dup bi-plus-square position-absolute" style="right: 32px"></i><i class="bi sup bi-x-square position-absolute text-danger" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#text-list');
                  } else {
                    $(
                      `<a href="#" id="${data[i].texts[j]._id}" class="text-item list-group-item list-group-item-action">${data[i].texts[j].title}<i class="bi dup bi-plus-square position-absolute" style="right: 32px"></i><i class="bi sup bi-x-square position-absolute text-danger" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#text-list');
                  }
                } else {
                  if (data[i].texts[j].published) {
                    $(
                      `<a href="#" id="${data[i].texts[j]._id}" class="text-item list-group-item list-group-item-action">${data[i].texts[j].title}&nbsp;<i class="bi bi-star-fill text-warning"></i><i class="bi dup bi-plus-square position-absolute" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#text-list');
                  } else {
                    $(
                      `<a href="#" id="${data[i].texts[j]._id}" class="text-item list-group-item list-group-item-action">${data[i].texts[j].title}<i class="bi dup bi-plus-square position-absolute" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#text-list');
                  }
                }
              }
            }
          } else {
            if (data[i].id === myUID || isAdmin) {
              $(
                `<h6 id="${data[i].id}" class="current">${data[i].name}&nbsp;<i class="bi bi-eye-slash open-close"></i></h6>`,
              ).appendTo('#text-list');
              deletable = true;
            } else {
              $(`<h6 id="${data[i].id}">${data[i].name}&nbsp;<i class="bi bi-eye-slash open-close"></i></h6>`).appendTo(
                '#text-list',
              );
            }
          }
        }
      }
      if (typeof cb === 'function') {
        cb(null);
      }
    })
    .fail(function (err) {
      if (typeof cb === 'function') {
        cb(err);
      }
    });
}

function play() {
  $(`#text-download`).addClass('disabled').attr('href', '#');
  $('#text-play').attr('disabled', true);
  $(`#text-play`).html('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>');
  $.post('/speak', {
    myID: myID,
    id: textData.id,
    text: textData.currentData.text,
    params: {
      name: textData.currentData.title,
      voice: 'natural',
      pitch: 3,
      volume: 3,
      rate: 100,
    },
  })
    .done(function () {})
    .fail(function () {});
}

function textSaveAndClose(id) {
  if (myUnsavedModal !== null) {
    $('.preset-save-and-close').data('text-id', null);
    if (id) {
      openNext = texts[id];
    } else {
      let now = new Date();
      openNext = {
        _id: `new_${now.getTime()}`,
        title: '',
        text: '',
        tags: [],
        published: false,
        locked: false,
        creator: Cookies.get('uid'),
      };
    }
    saveText();
    myUnsavedModal.hide();
  }
}

function textForceClose(id) {
  if (myUnsavedModal !== null) {
    $('.preset-save-and-close').data('text-id', null);
    myUnsavedModal.hide();
    if (id) {
      openText(texts[id]);
    } else {
      let now = new Date();
      textData = {
        id: `new_${now.getTime()}`,
        dirty: false,
        initData: { title: '', text: '', tags: [], published: false },
        currentData: { title: '', text: '', tags: [], published: false },
        published: false,
        locked: false,
        creator: Cookies.get('uid'),
      };
      addText();
    }
  }
}

function checkNameEmail() {
  let nameOK = false;
  if (`${$('#nom').val()}`.trim().length > 2) {
    nameOK = true;
  }
  let emailOK = false;
  if (`${$('#email').val()}`.trim().length > 3 && EMAIL_REGEX.test(`${$('#email').val()}`.trim())) {
    emailOK = true;
  }
  if (nameOK && emailOK) {
    $('.text-authenticated-save').removeClass('disabled');
  } else {
    $('.text-authenticated-save').addClass('disabled');
  }
}

function publishText() {
  if (textData.creator !== myUID && !isAdmin) {
    alert('Vous ne pouvez pas modifier un texte créé par autrui.');
    return;
  }
  textData.published = true;
  saveText();
}

function saveAnonymousText() {
  if (myInProgressModal !== null) {
    myInProgressModal.show();
  }

  $.post('/saveAnonymousText', {
    data: {
      title: `${$('#text-title').val()}`.trim(),
      text: `${$('#text').val()}`.trim(),
    },
  })
    .done(function () {
      setTimeout(function () {
        if (myAnonymousModal !== null) {
          myAnonymousModal.hide();
        }
        if (myInProgressModal !== null) {
          myInProgressModal.hide();
        }
        let now = new Date();
        textData = {
          id: `new_${now.getTime()}`,
          dirty: false,
          initData: { title: '', text: '', tags: [], published: false },
          currentData: { title: '', text: '', tags: [], published: false },
          published: false,
          locked: false,
          creator: Cookies.get('uid'),
        };
        addText();
      }, 1000);
    })
    .fail(function () {
      setTimeout(function () {
        if (myAnonymousModal !== null) {
          myAnonymousModal.hide();
        }
        if (myInProgressModal !== null) {
          myInProgressModal.hide();
        }
      }, 1000);
    });
}

function saveAuthenticatedText() {
  if (myInProgressModal !== null) {
    myInProgressModal.show();
  }

  $.post('/saveAuthenticatedText', {
    data: {
      title: `${$('#text-title').val()}`.trim(),
      text: `${$('#text').val()}`.trim(),
      name: `${$('#nom').val()}`.trim(),
      email: `${$('#email').val()}`.trim(),
    },
  })
    .done(function (result) {
      setTimeout(function () {
        if (myAnonymousModal !== null) {
          myAnonymousModal.hide();
        }
        if (myInProgressModal !== null) {
          myInProgressModal.hide();
        }
        Cookies.remove('textdata');
        Cookies.remove('uid');
        Cookies.remove('isadmin');
        Cookies.remove('username');
        Cookies.remove('textFilter');
        Cookies.remove('textdata');
        Cookies.set('anonymous', true);
        setTimeout(function () {
          alert(
            `Un email a été envoyé à l'adresse ${$(
              '#email',
            ).val()} avec un lien personnel permettant d'éditer vos textes.`,
          );
          location.reload();
        }, 250);
      }, 1000);
    })
    .fail(function () {
      setTimeout(function () {
        if (myAnonymousModal !== null) {
          myAnonymousModal.hide();
        }
        if (myInProgressModal !== null) {
          myInProgressModal.hide();
        }
        alert('Erreur : donnée (nom ou email) déjà existante ou invalide !');
      }, 1000);
    });
}

function saveText() {
  if (isAnonymous === true) {
    if (myAnonymousModal !== null) {
      myAnonymousModal.show();
    }
  } else {
    if (textData.creator !== myUID && !isAdmin) {
      alert('Vous ne pouvez pas modifier un texte créé par autrui.');
      return;
    }

    if (myInProgressModal !== null) {
      myInProgressModal.show();
    }

    $.post('/saveText', {
      data: textData,
    })
      .done(function (result) {
        loadTexts(function (err) {
          if (openNext !== null) {
            openText(openNext);
            openNext = null;
          } else {
            openText(result.doc);
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

function removeTag(tag) {
  if (preventLoop === true) {
    return;
  }
  preventLoop = true;

  if (textData.currentData.tags === undefined) {
    textData.currentData.tags = [];
  }

  textData.currentData.tags = textData.currentData.tags.filter((_tag) => {
    return _tag !== tag;
  });

  if (JSON.stringify(textData.currentData.tags) !== JSON.stringify(textData.initData.tags)) {
    textData.dirty = true;
    textData.published = false;

    if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (textData.creator === myUID || isAdmin)
    ) {
      $(`#text-save`).attr('disabled', false);
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }
    } else {
      $(`#text-save`).attr('disabled', true);
      $(`#text-publish`).attr('disabled', true);
    }

    if (isAnonymous) {
      $(`#text-publish`).attr('disabled', true);
    }
  } else {
    textData.dirty = false;
    $(`#text-save`).attr('disabled', true);
    if (textData.published) {
      $(`#text-publish`).attr('disabled', true);
    } else if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (textData.creator === myUID || isAdmin)
    ) {
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }
    }

    if (isAnonymous) {
      $(`#text-publish`).attr('disabled', true);
    }
  }

  Cookies.set('textdata', JSON.stringify(textData), { expires: 365 });

  preventLoop = false;
}

function addTag(tag) {
  if (preventLoop === true) {
    return;
  }
  preventLoop = true;

  if (textData.currentData.tags === undefined) {
    textData.currentData.tags = [];
  }

  if (textData.currentData.tags.indexOf(tag) === -1) {
    textData.currentData.tags.push(tag);
    $(
      `<span class='text-tag text-actual-tag badge bg-dark text-light mb-1'>${tag}<button type='button' class='text-removetag btn-close btn-close-white ms-1'></button></span>`,
    ).insertBefore(`#text-emptytag`);
  }

  if (JSON.stringify(textData.currentData.tags) !== JSON.stringify(textData.initData.tags)) {
    textData.dirty = true;
    textData.published = false;

    if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (textData.creator === myUID || isAdmin)
    ) {
      $(`#text-save`).attr('disabled', false);
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }

      if (isAnonymous) {
        $(`#text-publish`).attr('disabled', true);
      }
    } else {
      $(`#text-save`).attr('disabled', true);
      $(`#text-publish`).attr('disabled', true);

      if (isAnonymous) {
        $(`#text-publish`).attr('disabled', true);
      }
    }
  } else {
    textData.dirty = false;
    $(`#text-save`).attr('disabled', true);
    if (textData.published) {
      $(`#text-publish`).attr('disabled', true);
    } else if (
      `${textData.currentData.title}`.trim() &&
      textData.currentData.text &&
      (textData.creator === myUID || isAdmin)
    ) {
      if (textData.published) {
        $(`#text-publish`).attr('disabled', true);
      } else {
        $(`#text-publish`).attr('disabled', false);
      }
    }

    if (isAnonymous) {
      $(`#text-publish`).attr('disabled', true);
    }
  }

  Cookies.set('textdata', JSON.stringify(textData), { expires: 365 });

  preventLoop = false;
}

function doSearch(text) {
  textFilter.filter = text;
  Cookies.set('textFilter', JSON.stringify(textFilter), { expires: 365 });
  loadTexts(function (err) {});
}

function openText(data) {
  textData = {
    id: `${data._id}`,
    dirty: false,
    initData: {
      title: data.title,
      text: data.text,
      tags: JSON.parse(JSON.stringify(data.tags)),
      published: data.published === true,
    },
    currentData: {
      title: data.title,
      text: data.text,
      tags: JSON.parse(JSON.stringify(data.tags)),
      published: data.published === true,
    },
    published: data.published === true,
    locked: data.locked === true,
    creator: `${data.creator}`,
  };
  addText();
}
