import { EventDispatcher } from "three";

class GridDispatcher extends EventDispatcher {
  loaded() {
    this.dispatchEvent({ type: "onload", message: "" });
  }
}
export default new GridDispatcher();
