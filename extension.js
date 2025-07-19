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

let path;

let gOnIcon;
let gCheckIcon;
let gOffIcon;

const loop = new GLib.MainLoop(null, false);

function checkStatus(indicator) {
  var [ok, out, err, exit] = GLib.spawn_command_line_sync(
    "cat /etc/ufw/ufw.conf"
  );

  if (out.toString().includes("ENABLED=yes") > 0) {
    indicator._icon.gicon = gOnIcon;
  } else {
    indicator._icon.gicon = gOffIcon;
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

      // Connect click handler to launch `gufw`
      this.connect("button-press-event", () => {
        try {
          GLib.spawn_command_line_async("gufw");
        } catch (e) {
          console.log("Failed to launch gufw: " + e);
        }
        return Clutter.EVENT_STOP; // Prevent further event propagation
      });
    }
  }
);

export default class IndicatorExtension extends Extension {
  enable() {
    this.timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
      checkStatus(this._indicator);

      return GLib.SOURCE_CONTINUE;
    });

    path = this.path;

    gOnIcon = Gio.icon_new_for_string(path + "/on.png");
    gCheckIcon = Gio.icon_new_for_string(path + "/check.png");
    gOffIcon = Gio.icon_new_for_string(path + "/off.png");

    this._indicator = new Indicator();

    Main.panel.addToStatusArea(this.uuid, this._indicator);

    this._indicator._icon.gicon = gCheckIcon;

    loop.runAsync();
  }

  disable() {
    GLib.Source.remove(this.timeoutId);
    this._indicator.destroy();
    this._indicator = null;
  }
}
