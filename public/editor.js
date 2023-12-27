class AngryTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'STRONG';
    this.class = 'cdx-angry';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-emoji-angry-fill"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      strong: {
        class: 'cdx-angry',
      },
    };
  }
}

class HappyTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'B';
    this.class = 'cdx-happy';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-emoji-laughing"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      b: {
        class: 'cdx-happy',
      },
    };
  }
}

class AnnoyedTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'EM';
    this.class = 'cdx-annoyed';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-emoji-frown"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      em: {
        class: 'cdx-annoyed',
      },
    };
  }
}

class QuestionTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'I';
    this.class = 'cdx-question';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-patch-question-fill"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      i: {
        class: 'cdx-question',
      },
    };
  }
}

class PauseTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'CODE';
    this.class = 'cdx-pause';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-clock-fill"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      code: {
        class: 'cdx-pause',
      },
    };
  }
}

class StrongTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'SUP';
    this.class = 'cdx-strong';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-patch-plus-fill"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      sup: {
        class: 'cdx-strong',
      },
    };
  }
}

class ReducedTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'SUB';
    this.class = 'cdx-reduced';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-patch-minus"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      sub: {
        class: 'cdx-reduced',
      },
    };
  }
}

class ABBRTool {
  static get isInline() {
    return true;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
    this.tag = 'ABBR';
    this.class = 'cdx-abbr';
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<i class="bi bi-type"></i>';
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
      return;
    }
    this.wrap(range);
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);
    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);
    this.api.selection.expandToTag(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();
    mark.remove();
    range.insertNode(text);
  }

  checkState() {
    const mark = this.api.selection.findParentTag(this.tag);
    this.state = !!mark;
  }

  static get sanitize() {
    return {
      abbr: {
        class: 'cdx-abbr',
      },
    };
  }
}

/*
const editor = new EditorJS({
  holder: 'editor',
  autofocus: true,
  inlineToolbar: ['angry', 'happy', 'question', 'annoyed', 'strong', 'reduced', 'pause', 'abbr'],
  tools: {
    angry: {
      class: AngryTool,
      inlineToolbar: true,
    },
    happy: {
      class: HappyTool,
      inlineToolbar: true,
    },
    question: {
      class: QuestionTool,
      inlineToolbar: true,
    },
    annoyed: {
      class: AnnoyedTool,
      inlineToolbar: true,
    },
    pause: {
      class: PauseTool,
      inlineToolbar: true,
    },
    reduced: {
      class: ReducedTool,
      inlineToolbar: true,
    },
    strong: {
      class: StrongTool,
      inlineToolbar: true,
    },
    abbr: {
      class: ABBRTool,
      inlineToolbar: true,
    },
  },
});

$('#speak').on('click', () => {
  $('#play').attr('disabled', true);
  $('#speak').attr('disabled', true);
  sound = null;
  editor
    .save()
    .then((data) => {
      const text = [];
      for (let i = 0; i < data.blocks.length; i++) {
        text.push(data.blocks[i].data.text);
      }
      $.post('/speak', { text: text });
    })
    .catch((error) => {});
});
*/
