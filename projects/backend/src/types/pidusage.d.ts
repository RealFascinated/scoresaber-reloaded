declare module "pidusage" {
  interface Stats {
    cpu: number;
    memory: number;
    ppid: number;
  }

  function pidusage(pid: number): Promise<Stats>;
  export = pidusage;
}
