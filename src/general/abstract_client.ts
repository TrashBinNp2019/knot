/**
 * Interface for typechecking a database client object.
 */
export interface Client {
  /**
   * Tests the database availability.
   * @returns {Promise<Error | undefined>} Resolves with an error if the database 
   * is not available, undefined otherwise.
   */ 
  test: () => Promise<Error | undefined>;
  /**
   * Inserts a new host entry into the database.
   * @param {Host} host The host to insert.
   */  
  push: (host: Host) => void;
  pushImg: (img: Image) => void;
}

/**
 * A host entry.
 */
export class Host {
  /**
   * Title for the host.
   */ 
  title: string;
  /**
   * Address, through which the host is accessible
   * (e.g. http://www.example.com).
   */  
  addr: string;
  /**
   * Any valuable information, provided by the host.
   */ 
  contents: string;
  /**
   * Other host info, ignored by the search engine.
   */ 
  keywords: string;
  
  constructor(title: string, addr: string, contents: string, keywords: string) {
    this.title = title;
    this.addr = addr;
    this.contents = contents;
    this.keywords = keywords;
  }
}

export class Image {
  src: string;
  dsc: string;
  addr: string;
  
  constructor(src: string, dsc: string, addr: string) {
    this.src = src;
    this.dsc = dsc;
    this.addr = addr;
  }
}
