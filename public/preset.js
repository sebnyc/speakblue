const presetTemplate = `<div class='preset actual-preset card shadow ms-0 my-1 me-2 p-0' id='preset-{{preset-id}}' style='width: 16.5rem'>
  <div class='card-body px-3 py-1 container'>
    <div class='row my-2 px-1'>
      <div class="col-1 px-1">
        <i id='preset-fav-{{preset-id}}' class="bi bi-star{{preset-fav}} fav"></i>
      </div>
      <div class="col-10">
        <input
          type='text'
          class='preset-name form-control'
          id='preset-name-{{preset-id}}'
          placeholder='Saisir un nom de preset...'
          value='{{preset-name}}'
        />
      </div>
      <div class="col-1 px-1">
        <i id='preset-quote-{{preset-id}}' class="bi bi-chat-left-quote quote"></i>
      </div>
      <button
        id='preset-close-{{preset-id}}'
        type='button'
        class='preset-close btn-close position-absolute top-0 end-0'
      ></button>
    </div>
    <div class='row my-2'>
      <div class='btn-group col'>
      <input
          type='radio'
          class='preset-voice btn-check'
          name='preset-voice-{{preset-id}}'
          id='preset-voice-whisper-{{preset-id}}'
          value='whisper'
          autocomplete='off'
          {{whisper-checked}}
        />
        <label class='btn btn-outline-primary' for='preset-voice-whisper-{{preset-id}}'><i class="fa-solid fa-wind"></i></label>
        <input
          type='radio'
          class='preset-voice btn-check'
          name='preset-voice-{{preset-id}}'
          id='preset-voice-emotional-{{preset-id}}'
          value='emotional'
          autocomplete='off'
          {{emotional-checked}}
        />
        <label class='btn btn-outline-primary' for='preset-voice-emotional-{{preset-id}}'><i
            class='bi bi-exclamation-circle'
          ></i></label>
        <input
          type='radio'
          class='preset-voice btn-check'
          name='preset-voice-{{preset-id}}'
          id='preset-voice-natural-{{preset-id}}'
          value='natural'
          autocomplete='off'
          {{natural-checked}}
        />
        <label class='btn btn-outline-primary' for='preset-voice-natural-{{preset-id}}'><i class="fa-solid fa-face-meh"></i></label>
        <input
          type='radio'
          class='preset-voice btn-check'
          name='preset-voice-{{preset-id}}'
          id='preset-voice-question-{{preset-id}}'
          value='question'
          autocomplete='off'
          {{question-checked}}
        />
        <label class='btn btn-outline-primary' for='preset-voice-question-{{preset-id}}'><i
            class='bi bi-question-circle'
          ></i></label>
      </div>
    </div>
    <div class='row my-2'>
      <div class='btn-group col'>
        <i class='bi bi-arrow-down me-1'></i>
        <input
          type='range'
          class='preset-pitch form-range'
          min='1'
          max='5'
          step='1'
          value='{{preset-pitch}}'
          name='preset-pitch-{{preset-id}}'
          id='preset-pitch-{{preset-id}}'
        />
        <i class='bi bi-arrow-up ms-1'></i>
      </div>
    </div>
    <div class='row my-2'>
      <div class='btn-group col'>
        <i class='bi bi-volume-down-fill me-1'></i>
        <input
          type='range'
          class='preset-volume form-range'
          min='1'
          max='5'
          step='1'
          value='{{preset-volume}}'
          name='preset-volume-{{preset-id}}'
          id='preset-volume-{{preset-id}}'
        />
        <i class='bi bi-volume-up-fill ms-1'></i>
      </div>
    </div>
    <div class='row my-2 text-center'>
      <div class='btn-group col'>
        <i class='bi icon-slow text-primary me-1'></i>
        <input
          type='range'
          class='preset-rate form-range'
          min='0'
          max='200'
          step='1'
          value='{{preset-rate}}'
          name='preset-rate-{{preset-id}}'
          id='preset-rate-{{preset-id}}'
        />
        <i class='bi icon-fast text-primary ms-1'></i>
      </div>
      <small id="preset-ratevalue-{{preset-id}}">{{preset-rate}}%</small>
    </div>
    <hr />
    <div class='row my-2 p-0'>
      <div id="preset-play-group-{{preset-id}}" class="btn-group mx-2 p-0 col" role="group">
        <button type='button' class='preset-play btn btn-sm btn-warning' id='preset-play-{{preset-id}}' disabled>Jouer</button>
        <a href="#" target="_blank" download="" class="preset-download btn btn-sm btn-warning disabled" style="max-width: 30px" id="preset-download-{{preset-id}}">
          <i class="bi bi-download"></i>
        </a>
      </div>
      <!-- button
        type='button'
        class='preset-undo btn btn-sm btn-secondary ms-0 me-3 p-0 col'
        id='preset-undo-{{preset-id}}'
        style="max-width: 43px; position: relative; left: 2px"
        disabled
      ><i class="bi bi-arrow-counterclockwise"></i></button -->
      <div id="preset-save-group-{{preset-id}}" class="btn-group mx-2 p-0 col" role="group">
        <button type='button' class='preset-save btn btn-sm btn-primary' id='preset-save-{{preset-id}}' disabled>Sauver</button>
        <button type="button" class="preset-saveas btn btn-sm btn-primary" id="preset-saveas-{{preset-id}}" style="max-width: 30px">
          <i class="bi bi-plus-square"></i>
        </button>
      </div>
    </div>
    <hr />
    <div class='row my-2' style='padding: 0 25px 0 0;'>
      <div class='col position-relative px-1'>
        <span id='preset-emptytag-{{preset-id}}' class='preset-tag badge bg-dark text-light mb-1 invisible'>
          <button type='button' class='preset-removetag btn-close btn-close-white ms-1'></button>
        </span>
        <button
          id='preset-addtag-{{preset-id}}'
          type='button'
          class='preset-addtag badge btn btn-sm btn-primary position-absolute me-1' style='top: 0; right: -25px;'
        >
          <i class='bi bi-bookmark-plus-fill fs-6'></i>
        </button>
      </div>
    </div>
  </div>
</div>`;

let presets = {};
let compiledPresetTemplate = null;
let preventLoop = false;
let inited = false;
let supClicked = false;
let dupClicked = false;

function init() {
  if (compiledPresetTemplate === null) {
    compiledPresetTemplate = Handlebars.compile(presetTemplate);

    $(document).on('input', '.preset-name', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const widgetName = match[1];
        const presetId = match[2];
        const paramValue = `${target.val()}`.trim();
        modifyPreset(presetId, widgetName, paramValue);
      }
    });

    $(document).on('click', '.btn-check', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('name'));
      if (match && match[1] && match[2]) {
        const widgetName = match[1];
        const presetId = match[2];
        const paramValue = target.val();
        modifyPreset(presetId, widgetName, paramValue);
      }
    });

    $(document).on('input', '.form-range', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const widgetName = match[1];
        const presetId = match[2];
        const paramValue = parseInt(target.val(), 10);
        modifyPreset(presetId, widgetName, paramValue);
      }
    });

    $(document).on('click', '.preset-play', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        if (
          sounds[presetId] !== undefined &&
          sounds[presetId] !== null &&
          typeof sounds[presetId].play === 'function'
        ) {
          clickedOnce = true;
          if (sounds[presetId].playing()) {
            sounds[presetId].stop();
          } else {
            sounds[presetId].play();
          }
        } else {
          play(presetId);
        }
      }
    });

    $(document).on('click', '.preset-undo', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        resetPreset(presetId);
      }
    });

    $(document).on('click', '.preset-save', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        savePreset(presetId);
      }
    });

    $(document).on('click', '.preset-saveas', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        let now = new Date();
        let id = `new_${now.getTime()}`;
        let name = window.prompt('Copier le preset sous le nom :', `${presets[presetId].name} (copie)`);
        presets[id] = {
          _id: id,
          name: name,
          voice: presets[presetId].voice,
          pitch: presets[presetId].pitch,
          volume: presets[presetId].volume,
          rate: presets[presetId].rate,
          tags: JSON.parse(JSON.stringify(presets[presetId].tags)),
          locked: false,
          fav: false,
          creator: Cookies.get('uid'),
        };
        addPreset(id);
      }
    });

    $(document).on('click', '.preset-close', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        closePreset(presetId);
      }
    });

    $(document).on('click', '.preset-removetag', function (e) {
      const target = $(e.currentTarget).parents('.actual-preset');
      const match = /^preset-(\w+)$/.exec(target.attr('id'));
      if (match && match[1]) {
        const presetId = match[1];
        if (presets[presetId].creator === myUID) {
          const tag = $(e.currentTarget).parent('.preset-actual-tag').text();
          $(e.currentTarget).parent('.preset-actual-tag').remove();
          removeTag(presetId, tag);
        }
      }
    });

    $(document).on('click', '.preset-addtag', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        if (presets[presetId].creator === myUID) {
          const tag = window.prompt('Ajouter un tag :', '');
          if (tag && `${tag}`.toLowerCase().trim()) {
            addTag(presetId, `${tag}`.toLowerCase().trim());
          }
        }
      }
    });

    $(document).on('click', '.fav', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        if (presets[presetId].creator === myUID) {
          if ($(target).hasClass('bi-star')) {
            $(target).removeClass('bi-star').addClass('bi-star-fill').addClass('text-warning');
          } else {
            $(target).addClass('bi-star').removeClass('bi-star-fill').removeClass('text-warning');
          }
          modifyPreset(presetId, 'fav', $(target).hasClass('bi-star-fill'));
        }
      }
    });

    $(document).on('click', '.quote', function (e) {
      const target = $(e.currentTarget);
      const match = /^preset-(\w+)-(\w+)$/.exec(target.attr('id'));
      if (match && match[1] && match[2]) {
        const presetId = match[2];
        if (presets[presetId].text) {
          $('#text').val(presets[presetId].text);
          setText();
        }
      }
    });

    $(document).on('click', '.preset-save-and-close', function (e) {
      presetSaveAndClose($('.preset-save-and-close').data('preset-id'));
    });

    $(document).on('click', '.preset-force-close', function (e) {
      presetForceClose($('.preset-save-and-close').data('preset-id'));
    });
  }
}

function removeTag(id, tag) {
  if (preventLoop === true) {
    return;
  }
  preventLoop = true;
  const data = $(`#preset-container>#preset-${id}`).data('status');
  if (data.currentData.tags === undefined) {
    data.currentData.tags = [];
  }
  data.currentData.tags = data.currentData.tags.filter((_tag) => {
    return _tag !== tag;
  });
  if (JSON.stringify(data.currentData.tags) !== JSON.stringify(data.initData.tags)) {
    data.dirty = true;
    $(`#preset-undo-${id}`).attr('disabled', false);
    if (`${data.currentData.name}`.trim() && presets[id] && presets[id].creator === myUID) {
      $(`#preset-save-${id}`).attr('disabled', false);
    } else {
      $(`#preset-save-${id}`).attr('disabled', true);
    }
  } else {
    data.dirty = false;
    $(`#preset-undo-${id}`).attr('disabled', true);
    $(`#preset-save-${id}`).attr('disabled', true);
  }
  $(`#preset-container>#preset-${id}`).data('status', data);
  preventLoop = false;
}

function addTag(id, tag) {
  if (preventLoop === true) {
    return;
  }
  preventLoop = true;
  const data = $(`#preset-container>#preset-${id}`).data('status');
  if (data.currentData.tags === undefined) {
    data.currentData.tags = [];
  }
  if (data.currentData.tags.indexOf(tag) === -1) {
    data.currentData.tags.push(tag);
    $(
      `<span class='preset-tag preset-actual-tag badge bg-dark text-light mb-1'>${tag}<button type='button' class='preset-removetag btn-close btn-close-white ms-1'></button></span>`,
    ).insertBefore(`#preset-emptytag-${id}`);
  }
  if (JSON.stringify(data.currentData.tags) !== JSON.stringify(data.initData.tags)) {
    data.dirty = true;
    $(`#preset-undo-${id}`).attr('disabled', false);
    if (`${data.currentData.name}`.trim() && presets[id] && presets[id].creator === myUID) {
      $(`#preset-save-${id}`).attr('disabled', false);
    } else {
      $(`#preset-save-${id}`).attr('disabled', true);
    }
  } else {
    data.dirty = false;
    $(`#preset-undo-${id}`).attr('disabled', true);
    $(`#preset-save-${id}`).attr('disabled', true);
  }
  $(`#preset-container>#preset-${id}`).data('status', data);
  preventLoop = false;
}

function resetPreset(id) {
  if (preventLoop === true) {
    return;
  }
  preventLoop = true;
  const data = $(`#preset-container>#preset-${id}`).data('status');
  data.currentData = JSON.parse(JSON.stringify(data.initData));
  for (let key in data.currentData) {
    switch (key) {
      case 'name':
      case 'pitch':
      case 'volume':
      case 'rate':
        $(`#preset-${key}-${id}`).val(data.currentData[key]);
        if (key === 'rate') {
          $(`#preset-ratevalue-${id}`).text(data.currentData[key] + '%');
        }
        break;
      case 'voice':
        $(`input[name=preset-voice-${id}][value=${data.currentData[key]}]`).prop('checked', true);
        break;
      case 'tags':
        $(`#preset-${id} .preset-actual-tag`).remove();
        if (Array.isArray(data.currentData.tags)) {
          for (let i = 0; i < data.currentData.tags.length; i++) {
            $(
              `<span class='preset-tag preset-actual-tag badge bg-dark text-light mb-1'>${data.currentData.tags[i]}<button type='button' class='preset-removetag btn-close btn-close-white ms-1'></button></span>`,
            ).insertBefore(`#preset-emptytag-${id}`);
          }
        }
        break;
      case 'fav':
        if (data.currentData[key]) {
          $(`#preset-${key}-${id}`).removeClass('bi-star').addClass('bi-star-fill').addClass('text-warning');
        } else {
          $(`#preset-${key}-${id}`).addClass('bi-star').removeClass('bi-star-fill').removeClass('text-warning');
        }
        break;
      default:
        break;
    }
  }

  $(`#preset-undo-${id}`).attr('disabled', true);
  if (data.dirty === false) {
    if (`${data.currentData.name}`.trim() && presets[id] && presets[id].creator === myUID) {
      $(`#preset-save-${id}`).attr('disabled', false);
    } else {
      $(`#preset-save-${id}`).attr('disabled', true);
    }
  } else {
    data.dirty = false;
    $(`#preset-save-${id}`).attr('disabled', true);
  }

  if (sounds[id] !== undefined && sounds[id] !== null && typeof sounds[id].play === 'function') {
    sounds[id].unload();
    delete sounds[id];
    $(`#preset-play-${id}`).removeClass('btn-success').addClass('btn-warning').html('Jouer');
    $(`#text-download-${id}`).removeClass('btn-success').addClass('btn-warning').addClass('disabled').attr('href', '#');
  }

  if (text) {
    $(`#preset-play-${id}`).attr('disabled', false);
  } else {
    $(`#preset-play-${id}`).attr('disabled', true);
  }

  $(`#preset-container>#preset-${id}`).data('status', data);
  preventLoop = false;
}

function play(id) {
  $(`#text-download-${id}`).addClass('disabled').attr('href', '#');
  $('.preset-play').attr('disabled', true);
  $(`#preset-play-${id}`).html('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>');
  const data = $(`#preset-container>#preset-${id}`).data('status');
  $.post('/speak', {
    myID: myID,
    id: id,
    text: `${$('#text').val()}`.trim(),
    params: data.currentData,
  })
    .done(function () {})
    .fail(function () {});
}

function savePreset(id) {
  if (presets[id].creator !== myUID) {
    alert('Vous ne pouvez pas modifier un preset créé par autrui.');
    return;
  }
  if (myInProgressModal !== null) {
    myInProgressModal.show();
  }
  const data = $(`#preset-container>#preset-${id}`).data('status');

  $.post('/savePreset', {
    init: presets[id],
    current: data.currentData,
    text: text,
  })
    .done(function (result) {
      if (/new_/.test(id)) {
        for (let i = 0; i < addedPresets.length; i++) {
          if (id === addedPresets[i]) {
            addedPresets[i] = result.doc._id;
            presets[id]._id = result.doc._id;
            presets[result.doc._id] = JSON.parse(JSON.stringify(presets[id]));
            addedPresetsData[result.doc._id] = JSON.parse(JSON.stringify(presets[id]));
            delete presets[id];
            delete addedPresetsData[id];
          }
        }
      }
      Cookies.set('addedPresets', JSON.stringify(addedPresets), { expires: 365 });
      Cookies.set('addedPresetsData', JSON.stringify(addedPresetsData), { expires: 365 });
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

function closePreset(id, force) {
  const data = $(`#preset-container>#preset-${id}`).data('status');
  if (data.dirty === false || force === true) {
    $(`#preset-container>#preset-${id}`).hide(60, () => {
      $(`#preset-container>#preset-${id}`).remove();
    });
    addedPresets = addedPresets.filter((_id) => {
      return _id !== id;
    });
    delete addedPresetsData[id];
    Cookies.set('addedPresets', JSON.stringify(addedPresets), { expires: 365 });
    Cookies.set('addedPresetsData', JSON.stringify(addedPresetsData), { expires: 365 });
  } else if (myUnsavedModal !== null) {
    $('.preset-save-and-close').data('preset-id', id);
    if (presets[id].creator === myUID) {
      $(`.preset-save-and-close`).attr('disabled', false);
    } else {
      $(`.preset-save-and-close`).attr('disabled', true);
    }
    myUnsavedModal.show();
  }
}

function presetSaveAndClose(id) {
  if (id && myUnsavedModal !== null) {
    $('.preset-save-and-close').data('preset-id', null);
    savePreset(id);
    myUnsavedModal.hide();
    closePreset(id);
  }
}

function presetForceClose(id) {
  if (id && myUnsavedModal !== null) {
    $('.preset-save-and-close').data('preset-id', null);
    myUnsavedModal.hide();
    closePreset(id, true);
  }
}

function modifyPreset(id, name, value) {
  if (preventLoop === true) {
    return;
  }

  preventLoop = true;
  const data = $(`#preset-container>#preset-${id}`).data('status');
  data.currentData[name] = value;
  if (name === 'rate') {
    $(`#preset-ratevalue-${id}`).text(value + '%');
  }
  if (JSON.stringify(data.currentData) !== JSON.stringify(data.initData)) {
    data.dirty = true;
    $(`#preset-undo-${id}`).attr('disabled', false);
    if (`${data.currentData.name}`.trim() && presets[id] && presets[id].creator === myUID) {
      $(`#preset-save-${id}`).attr('disabled', false);
    } else {
      $(`#preset-save-${id}`).attr('disabled', true);
    }

    if (sounds[id] !== undefined && sounds[id] !== null && typeof sounds[id].play === 'function') {
      sounds[id].unload();
      delete sounds[id];
      $(`#preset-play-${id}`).removeClass('btn-success').addClass('btn-warning').html('Jouer');
      $(`#text-download-${id}`)
        .removeClass('btn-success')
        .addClass('btn-warning')
        .addClass('disabled')
        .attr('href', '#');
    }

    if (text) {
      $(`#preset-play-${id}`).attr('disabled', false);
    } else {
      $(`#preset-play-${id}`).attr('disabled', true);
    }
  } else {
    data.dirty = false;
    $(`#preset-undo-${id}`).attr('disabled', true);
    $(`#preset-save-${id}`).attr('disabled', true);
  }
  $(`#preset-container>#preset-${id}`).data('status', data);
  preventLoop = false;
}

function loadPresets(cb) {
  $.get('/presets')
    .done(function (data) {
      $('#preset-list').empty();
      if (data && Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].presets.length; j++) {
            presets[data[i].presets[j]._id] = data[i].presets[j];
          }
          if (presetFilter.closed.indexOf(data[i].id) === -1) {
            if (presetFilter.filter) {
              data[i].presets = data[i].presets.filter((item) => {
                let hasTag = false;
                if (Array.isArray(item.tags) && item.tags.length > 0) {
                  for (let k = 0; k < item.tags.length; k++) {
                    if (`${item.tags[k]}`.toLowerCase().indexOf(`${presetFilter.filter}`.toLowerCase()) !== -1) {
                      hasTag = true;
                      break;
                    }
                  }
                }
                return hasTag || `${item.name}`.toLowerCase().indexOf(`${presetFilter.filter}`.toLowerCase()) !== -1;
              });
            }
            if (data[i].presets.length > 0) {
              let deletable = false;
              if (data[i].id === myUID) {
                $(
                  `<h6 id="${data[i].id}" class="current">${data[i].name}&nbsp;<i class="bi bi-eye open-close"></i></h6>`,
                ).appendTo('#preset-list');
                deletable = true;
              } else {
                $(`<h6 id="${data[i].id}">${data[i].name}&nbsp;<i class="bi bi-eye open-close"></i></h6>`).appendTo(
                  '#preset-list',
                );
              }
              for (let j = 0; j < data[i].presets.length; j++) {
                let summary = '';
                if (Array.isArray(data[i].presets[j].tags) && data[i].presets[j].tags.length > 0) {
                  summary += `<br><small class="tags badge badge-secondary">${data[i].presets[j].tags.join(
                    '</small><small class="tags badge badge-secondary">',
                  )}</small>`;
                }
                if (deletable) {
                  if (data[i].presets[j].fav) {
                    $(
                      `<a href="#" id="${data[i].presets[j]._id}" class="preset-item list-group-item list-group-item-action">${data[i].presets[j].name}&nbsp;<i class="bi bi-star-fill text-warning"></i><i class="bi dup bi-plus-square position-absolute" style="right: 32px"></i><i class="bi sup bi-x-square position-absolute text-danger" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#preset-list');
                  } else {
                    $(
                      `<a href="#" id="${data[i].presets[j]._id}" class="preset-item list-group-item list-group-item-action">${data[i].presets[j].name}<i class="bi dup bi-plus-square position-absolute" style="right: 32px"></i><i class="bi sup bi-x-square position-absolute text-danger" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#preset-list');
                  }
                } else {
                  if (data[i].presets[j].fav) {
                    $(
                      `<a href="#" id="${data[i].presets[j]._id}" class="preset-item list-group-item list-group-item-action">${data[i].presets[j].name}&nbsp;<i class="bi bi-star-fill text-warning"></i><i class="bi dup bi-plus-square position-absolute" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#preset-list');
                  } else {
                    $(
                      `<a href="#" id="${data[i].presets[j]._id}" class="preset-item list-group-item list-group-item-action">${data[i].presets[j].name}<i class="bi dup bi-plus-square position-absolute" style="right: 10px"></i>${summary}</a>`,
                    ).appendTo('#preset-list');
                  }
                }
              }
            }
          } else {
            if (data[i].id === myUID) {
              $(
                `<h6 id="${data[i].id}" class="current">${data[i].name}&nbsp;<i class="bi bi-eye-slash open-close"></i></h6>`,
              ).appendTo('#preset-list');
              deletable = true;
            } else {
              $(`<h6 id="${data[i].id}">${data[i].name}&nbsp;<i class="bi bi-eye-slash open-close"></i></h6>`).appendTo(
                '#preset-list',
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

function addPreset(id) {
  if (addedPresets.indexOf(id) !== -1) {
    return;
  }
  addedPresets.push(id);
  addedPresetsData[id] = JSON.parse(JSON.stringify(presets[id]));
  Cookies.set('addedPresets', JSON.stringify(addedPresets), { expires: 365 });
  Cookies.set('addedPresetsData', JSON.stringify(addedPresetsData), { expires: 365 });
  if (!inited) {
    inited = true;
    init();
  }
  openPreset(id);
  if (/new_/.test(id) && presets[id] && `${presets[id].name}`.trim() && presets[id].creator === myUID) {
    $(`#preset-save-${id}`).attr('disabled', false);
  }
}

function reopenPreset(id) {
  if (addedPresets.indexOf(id) === -1) {
    return;
  }
  if (!inited) {
    inited = true;
    init();
  }
  openPreset(id);
}

function openPreset(id) {
  let data;
  let dirty = false;

  if (!presets[id] && addedPresetsData[id]) {
    presets[id] = JSON.parse(JSON.stringify(addedPresetsData[id]));
  }

  if (/new_/.test(id) && presets[id] && `${presets[id].name}`.trim() && presets[id].creator === myUID) {
    dirty = true;
  }

  if (presets[id]) {
    $(
      compiledPresetTemplate({
        'preset-id': id,
        'preset-name': presets[id].name,
        'whisper-checked': presets[id].voice === 'whisper' ? 'checked' : '',
        'emotional-checked': presets[id].voice === 'emotional' ? 'checked' : '',
        'natural-checked': presets[id].voice === 'natural' ? 'checked' : '',
        'question-checked': presets[id].voice === 'question' ? 'checked' : '',
        'preset-pitch': presets[id].pitch,
        'preset-rate': presets[id].rate,
        'preset-volume': presets[id].volume,
        'preset-fav': presets[id].fav ? '-fill text-warning' : '',
      }),
    ).insertBefore('#preset-container>#preset-drop');
    data = {
      loaded: false,
      dirty: dirty,
      playing: false,
      initData: {
        name: $(`#preset-name-${id}`).val(),
        voice: $(`input[name='preset-voice-${id}']:checked`).val(),
        pitch: parseInt($(`#preset-pitch-${id}`).val(), 10),
        volume: parseInt($(`#preset-volume-${id}`).val(), 10),
        rate: parseInt($(`#preset-rate-${id}`).val(), 10),
        tags: Array.isArray(presets[id].tags) ? presets[id].tags : [],
        fav: $(`#preset-fav-${id}`).hasClass('bi-star-fill'),
      },
    };
    data.currentData = JSON.parse(JSON.stringify(data.initData));
    if (Array.isArray(presets[id].tags)) {
      for (let i = 0; i < presets[id].tags.length; i++) {
        $(
          `<span class='preset-tag preset-actual-tag badge bg-dark text-light mb-1'>${presets[id].tags[i]}<button type='button' class='preset-removetag btn-close btn-close-white ms-1'></button></span>`,
        ).insertBefore(`#preset-emptytag-${id}`);
      }
    }

    if (dirty) {
      $(`#preset-save-${id}`).attr('disabled', false);
    } else {
      $(`#preset-save-${id}`).attr('disabled', true);
    }
  }

  if (sounds[id] !== undefined && sounds[id] !== null && typeof sounds[id].play === 'function') {
    sounds[id].unload();
    delete sounds[id];
    $(`#text-download-${id}`).removeClass('btn-success').addClass('btn-warning').addClass('disabled').attr('href', '#');
  }

  if (text) {
    $(`#preset-play-${id}`).attr('disabled', false);
  } else {
    $(`#preset-play-${id}`).attr('disabled', true);
  }
  $(`#preset-container>#preset-${id}`).data('status', data);
}
