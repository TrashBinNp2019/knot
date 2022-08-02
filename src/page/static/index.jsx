class Search extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            val: ''
        };
    }

    handleChange = (e) => {
        this.setState({
            val: e.target.value.replace(/['"`]+/, '')
        });
    }

    handleSubmit = (e) => {
        e.preventDefault();
        this.props.onSubmit(this.state.val);
    }

    render() {
        return (
            <div className="searchBox">
                <input type="text" placeholder="Search" onChange={this.handleChange} value={this.state.val} />
                <button onClick={this.handleSubmit}>Search</button>
            </div>
        );
    }
}

class Results extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const results = this.props.entries.map(el => {
            return <Result title={el.title} addr={el.addr} content={el.content}/>
        });

        return (
            <div>
                <p>Results for {this.props.search}:<br /> <i>{this.props.entries.length} entr{this.props.entries.length === 1? 'y' : 'ies'} found</i></p>
                {results}
            </div>
        );
    }
}

class Result extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let { title, addr, content } = this.props;
        if (content.length === 0) {
            content = '-';
        } else if (content.length > 50) {
            content = content.substring(0, 50) + '...';
        }

        return (
            <div className='resultBox'>
                <h3>{title}</h3>
                <a href={addr}>{addr}</a>
                <p>{content}</p>
            </div>
        );
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            search: '',
            entries: [],
        }
    }

    handleSearch = (val) => {
        fetch('api/search?q=' + val)
            .then(res => res.json())
            .then(data => {
                let entries = data.map(el =>
                    ({
                        title: el.title,
                        addr: el.addr,
                        content: el.contents
                    })
                );

                this.setState({
                    search: val,
                    entries: entries,
                });
            }).catch(err => {
                console.log(err);
            });
    }

    render() {
        let results;
        if (this.state.search !== '') {
            results = <Results entries={this.state.entries} search={this.state.search} />
        }

        return (
            <div>
                <Search onSubmit={this.handleSearch}/>
                {results}
            </div>
        );
    }
}

const rootNode = document.getElementById("app");
const root = ReactDOM.createRoot(rootNode);
root.render(
    <App />
);