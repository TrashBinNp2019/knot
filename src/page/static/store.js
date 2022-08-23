function fetchPages(query) {
  return fetch(`/api/search?q=${query}`)
    .then(res => res.json());
}

function search() {
  return (dispatch, getState) => {
    return fetchPages(getState().general.query).then(
      data => {dispatch(display(data ?? []))},
      err => {console.log(err)}
    )
  }
}

const generalSlice = RTK.createSlice({
  name: 'results',
  initialState: {
    query: '',
    results: [],
  },
  reducers: {
    update: (state, action) => {
      console.log('update', action.payload);
      state.query = forSql(action.payload);
    },
    search: (state, action) => {
      console.log('search', state.query);
      state.results = [ 'hi' ];
    },
    display: (state, action) => {
      state.results = action.payload.map(el => ({
          title: el.title,
          addr: el.addr,
          content: el.contents,
          keywords: el.keywords,
      }));
    },
  },
});

const store = RTK.configureStore({
  reducer: {
    general: generalSlice.reducer,
  },
});
const Provider = ReactRedux.Provider;
const { update, display } = generalSlice.actions
const dispatch = store.dispatch;
