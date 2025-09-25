declare module 'ioredis' {
  export { default } from './ioredis-runtime';
  export type Redis = import('./ioredis-runtime').default;
}
