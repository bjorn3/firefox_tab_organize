# Tab organize

This is a firefox extension to organize and manipulate large amounts of tabs.

## Installation

First run `npm install` then go to `about:debugging` > This Firefox > Load Temporary Add-on and
select `manifest.json`. You will need to do this every time you restart firefox, as unsigned add-ons
can't be permanently installed unless you are on ESR or nightly and explicitly enable it in
`about:config`.

## Features

* Discard all loaded tabs. They will be loaded again once you switch back to them.
* List all tabs grouped by hostname.
* Discard and reload all tabs for a given hostname.
* Move tabs to the begin and end of a window.
* Directly close single tabs from the list of tabs. (As precaution you can't close all tabs for a
  single hostname at the same time.)
