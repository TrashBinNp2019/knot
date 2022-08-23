function Header(props) {
  // TODO search on enter
  
  const query = ReactRedux.useSelector(state => state.general.query);
  const dispatch = ReactRedux.useDispatch();
  
  return (
    <div className="headerBox">
      <input type="text" placeholder="Search" onChange={e => dispatch(update(e.target.value))} value={query} />
      <button onClick={() => dispatch(search())}>Search</button>
    </div>
  );
}

function Pages(props) {
  // TODO size limit
  
  const {results, query} = ReactRedux.useSelector(state => state.general, (a, b) => a.results === b.results);
  
  const pages = results.map(el => {
    return <Page title={el.title} addr={el.addr} content={el.content} keywords={el.keywords}/>
  });
  search = forHtml(search);
  
  if (query.length === 0) {
    return (<div />);
  } else {
    return (
      <div>
        <p>Results for {query}:<br /> <i>{pages.length} entr{pages.length === 1? 'y' : 'ies'} found</i></p>
        {pages}
      </div>
    );
  }
}

function Page(props) {
  let { title, addr, content, keywords } = props;
  title = forHtml(title);
  addr = forHtml(addr);
  content = forHtml(content);
  keywords = forHtml(keywords);
  
  content = displayable(content, 50);
  keywords = displayable(keywords, 20);
  
  return (
    <div className='resultBox'>
      <a className="pageTitle" href={addr}>{title}</a>
      <p className="pageContent">{content}</p>
      <p className="pageKeywords"><i>{keywords}</i></p>
    </div>
  );
}

function App (props) {
  return (
    <div>
        <Header/>
        <Pages />
    </div>
  );
}

const rootNode = document.getElementById("app");
const root = ReactDOM.createRoot(rootNode);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

function displayable(str, max_length) {
  if (typeof str !== 'string') {
    return '-';
  }
  
  if (str.length === 0) {
    str = '-';
  } else if (str.length > max_length) {
    str = str.substring(0, max_length - 3) + '...';
  }
  return str;
}
