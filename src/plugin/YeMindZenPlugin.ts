import { Plugin } from "siyuan";
import { registerYeMindDock } from "./dock";
import { registerYeMindTab } from "./tabs";
import { registerSettings } from "../settings/settings";

export default class YeMindZenPlugin extends Plugin {
  async onload(): Promise<void> {
    registerYeMindTab(this);
    registerYeMindDock(this);
    registerSettings(this);
  }
}
