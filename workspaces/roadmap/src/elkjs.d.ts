declare module "elkjs/lib/elk.bundled.js" {
  export default class ELK {
    layout<T>(graph: T): Promise<T>;
  }
}
