/** Capture choices once; no retry/fallback between HTTP and native actions. */
export class TransportClient {
  constructor(api, web, modes) { this.api = api; this.web = web; this.modes = modes; }
  capture() {
    const read = this[this.modes.read], write = this[this.modes.manage];
    return { folders: (...args) => read.folders(...args), videos: (...args) => read.videos(...args), mutate: (...args) => write.mutate(...args) };
  }
  folders(...args) { return this.capture().folders(...args); }
  videos(...args) { return this.capture().videos(...args); }
}
