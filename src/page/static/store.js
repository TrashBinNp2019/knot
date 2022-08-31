let PAGES_TOTAL = 0;
let IMAGES_TOTAL = 0;

function fetchPages(query, page = 1) {
  return fetch(`/api/pages/search?q=${query}&p=${page}`)
    .then(res => res.json());
}

function fetchImages(query, page = 1) {
  return fetch(`/api/images/search?q=${query}&p=${page}`)
    .then(res => res.json());
}

function search() {
  return (dispatch, getState) => {
    switch (getState().general.mode) {
      case 'pages':
        return fetchPages(getState().general.query).then(
          data => {dispatch(display(data ?? { count: 0, rows: [] }))},
          err => {console.log(err)})
      case 'images':
        return fetchImages(getState().general.query).then(
          data => {dispatch(display(data ?? { count: 0, rows: [] }))},
          err => {console.log(err)})
    }
  }
}

function load() {
  return (dispatch, getState) => {
    switch (getState().general.mode) {
      case 'pages':
        return fetchPages(getState().general.query, getState().general.currentPage + 1).then(
          data => {dispatch(append(data ?? { count: 0, rows: [] }))},
          err => {console.log(err)})
      case 'images':
        return fetchImages(getState().general.query, getState().general.currentPage + 1).then(
          data => {dispatch(append(data ?? { count: 0, rows: [] }))},
          err => {console.log(err)})
    }
  }
}

const generalSlice = RTK.createSlice({
  name: 'results',
  initialState: {
    query: '',
    mode: 'pages',
    results: { count: 0, rows: [] },
    total: 0,
    currentPage: 1,
  },
  reducers: {
    update: (state, action) => {
      state.query = forSql(action.payload);
    },
    display: (state, action) => {
      switch (state.mode) {
        case 'pages':
          state.results = { count: action.payload.count, rows: action.payload.rows.map(el => ({
            title: el.title,
            addr: el.addr,
            content: el.contents,
            keywords: el.keywords,
          }))};
          break;
        case 'images':
          state.results = { count: action.payload.count, rows: action.payload.rows.map(el => ({
            title: el.dsc,
            addr: el.addr,
            content: el.src,
          }))};
          break;
      }
      state.currentPage = 1;
    },
    append: (state, action) => {
      switch (state.mode) {
        case 'pages':
          state.results = { count: action.payload.count, rows: [...state.results.rows, ...action.payload.rows.map(el => ({
            title: el.title,
            addr: el.addr,
            content: el.contents,
            keywords: el.keywords,
          }))]};
          break;
        case 'images':
          state.results = { count: action.payload.count, rows: [...state.results.rows, ...action.payload.rows.map(el => ({
            title: el.dsc,
            addr: el.addr,
            content: el.src,
          }))]};
          break;
      }
      state.currentPage += 1;
    },
    setMode: (state, action) => {
      let mode = "pages";
      let total = PAGES_TOTAL;
      switch (action.payload) {
        case 'images':
          mode = 'images';
          total = IMAGES_TOTAL;
          break;
      }
      state.total = total;
      state.mode = mode;
      state.results = { count: 0, rows: [] };
    },
  },
});

const store = RTK.configureStore({
  reducer: {
    general: generalSlice.reducer,
  },
});
const Provider = ReactRedux.Provider;
const { update, display, setMode, append } = generalSlice.actions
const dispatch = store.dispatch;

fetch('/api/pages/count').then(res => res.json()).then(
  data => {
    PAGES_TOTAL = data.count;
    dispatch(setMode('pages'));
  },
  err => {
    console.log(err);
  },
);

fetch('/api/images/count').then(res => res.json()).then(
  data => {
    IMAGES_TOTAL = data.count;
  },
  err => {
    console.log(err);
  }
);
