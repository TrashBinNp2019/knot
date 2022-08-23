function fetchPages(query) {
  return fetch(`/api/pages/search?q=${query}`)
    .then(res => res.json());
}

function fetchImages(query) {
  return fetch(`/api/images/search?q=${query}`)
    .then(res => res.json());
}

function search() {
  return (dispatch, getState) => {
    switch (getState().general.mode) {
      case 'pages':
          return fetchPages(getState().general.query).then(
            data => {dispatch(display(data ?? []))},
            err => {console.log(err)}
          )
      case 'images':
          return fetchImages(getState().general.query).then(
            data => {dispatch(display(data ?? []))},
            err => {console.log(err)}
          )
    }
  }
}

const generalSlice = RTK.createSlice({
  name: 'results',
  initialState: {
    query: '',
    mode: 'images',
    results: [],
  },
  reducers: {
    update: (state, action) => {
      state.query = forSql(action.payload);
    },
    setMode: (state, action) => {
      switch (action.payload) {
        case 'pages':
          state.mode = 'pages';
          break;
        case 'images':
          state.mode = 'images';
          break;
        default:
          state.mode = 'pages';
          break;
      }
    },
    display: (state, action) => {
      switch (state.mode) {
        case 'pages':
          state.results = action.payload.map(el => ({
            title: el.title,
            addr: el.addr,
            content: el.contents,
            keywords: el.keywords,
          }));
          break;
        case 'images':
          state.results = action.payload.map(el => ({
            title: el.dsc,
            addr: el.addr,
            content: el.src,
          }));
          break;
      }
    },
  },
});

const store = RTK.configureStore({
  reducer: {
    general: generalSlice.reducer,
  },
});
const Provider = ReactRedux.Provider;
const { update, display, setMode } = generalSlice.actions
const dispatch = store.dispatch;
