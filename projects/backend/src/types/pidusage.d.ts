declare module "pidusage" {
  interface Stats {
    cpu: number;
    memory: number;
    ppid: number;
    pid: number;
    ctime: number;
    elapsed: number;
    timestamp: number;
    network?: {
      rx: number;
      tx: number;
    };
  }

  function pidusage(pid: number): Promise<Stats>;
  export = pidusage;
}
