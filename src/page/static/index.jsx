function Header(props) {
  // TODO search on enter
  
  const {query, mode} = ReactRedux.useSelector(state => state.general);
  const dispatch = ReactRedux.useDispatch();

  let modes = ['pages', 'images'].map(val => 
    <a className={val === mode? 'mode modeActive' : 'mode modeInactive'} onClick={() => dispatch(setMode(val))}>{val}</a>  
  );
  
  return (
    <div className="headerWrapper"> 
      <div className="headerBox">
        <input type="text" placeholder="Search" onChange={e => dispatch(update(e.target.value))} value={query} />
        <button onClick={() => dispatch(search())}>Search</button>
        <div className="modeBox">  
          {modes}
        </div>
      </div>
    </div>
  );
}

function Results(props) {
  // TODO size limit
  
  const {results, query, mode} = ReactRedux.useSelector(state => state.general, (a, b) => a.results === b.results);
  
  let displayed = [];
  switch (mode) {
    case 'pages':
      displayed = results.map(el => 
        <Page title={el.title} addr={el.addr} content={el.content} keywords={el.keywords}/>
      );
      break
    case 'images':
      displayed = results.map(el =>
        <Image title={el.title} addr={el.addr} content={el.content}/>
      );
      break;
  }
  
  if (query.length === 0) {
    return (<div />);
  } else {
    return (
      <div className="resultsWrapper">
        <div className="resultsBox">
          <p>Results for {forHtml(query)}:<br /> <i>{displayed.length} entr{displayed.length === 1? 'y' : 'ies'} found</i></p>
          {displayed}
        </div>
      </div>
    );
  }
}

function Page(props) {
  let { title, addr, content, keywords } = props;
  title = forHtml(title);
  addr = forHtml(addr);
  content = displayable(forHtml(content), 50);
  keywords = displayable(forHtml(keywords), 20);
  
  return (
    <div className='resultBox'>
      <a className="pageTitle" href={addr}>{title}</a>
      <p className="pageContent">{content}</p>
      <p className="pageKeywords"><i>{keywords}</i></p>
    </div>
  );
}

function Image(props) {
  let { title, addr, content } = props;
  title = displayable(forHtml(title), 50);
  
  return (
    <div className='resultBox'>
      <a href={addr}>
        <img className='imgContent' src={content}></img>
      </a>
      <p className="pageContent">{title}</p>
    </div>
  );
}

function App (props) {
  return (
    <div>
        <Header/>
        <Results />
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
