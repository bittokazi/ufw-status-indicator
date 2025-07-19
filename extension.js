/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

let gOnIcon;
let gCheckIcon;
let gOffIcon;
let path = null;

function checkStatus(indicator) {
  try {
    let file = Gio.File.new_for_path("/etc/ufw/ufw.conf");
    file.load_contents_async(null, (file, res) => {
      try {
        let [, contents] = file.load_contents_finish(res);
        let text = imports.byteArray.toString(contents);
        if (text.includes("ENABLED=yes")) {
          indicator._icon.gicon = gOnIcon;
        } else {
          indicator._icon.gicon = gOffIcon;
        }
      } catch (e) {
        console.log(e, "Failed to read ufw.conf");
      }
    });
  } catch (e) {
    console.log(e, "Error checking UFW status");
  }
}

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("UFW Status Indicator"));

      this._icon = new St.Icon({
        gicon: gCheckIcon,
        style_class: "system-status-icon",
      });

      this.add_child(this._icon);

      this.connect("button-press-event", () => {
        try {
          Gio.Subprocess.new(["gufw"], Gio.SubprocessFlags.NONE);
        } catch (e) {
          console.log(e, "Failed to launch gufw");
        }
        return Clutter.EVENT_STOP;
      });
    }
  }
);

export default class IndicatorExtension extends Extension {
  enable() {
    path = this.path;

    gOnIcon = Gio.icon_new_for_string(`${path}/on.png`);
    gCheckIcon = Gio.icon_new_for_string(`${path}/check.png`);
    gOffIcon = Gio.icon_new_for_string(`${path}/off.png`);

    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator);

    this._indicator._icon.gicon = gCheckIcon;

    this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
      checkStatus(this._indicator);
      return GLib.SOURCE_CONTINUE;
    });
  }

  disable() {
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = null;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    gOnIcon = null;
    gOffIcon = null;
    gCheckIcon = null;
    path = null;
  }
}
