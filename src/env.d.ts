export {};
declare global {
  interface Window {
    studyflowDesktop?: {
      onBeforeClose: (callback: () => Promise<boolean>) => () => void;
    };
  }
}
