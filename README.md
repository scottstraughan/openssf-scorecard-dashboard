[![Scorecard supply-chain security](https://github.com/scottstraughan/openssf-scorecard-dashboard/actions/workflows/scorecard.yml/badge.svg)](https://github.com/scottstraughan/openssf-scorecard-dashboard/actions/workflows/scorecard.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/scottstraughan/openssf-scorecard-dashboard/badge)](https://scorecard.dev/viewer/?uri=github.com/scottstraughan/openssf-scorecard-dashboard)

# Open-Source Security Dashboard

<a href="https://www.scoredash.xyz" target="_blank">
  <img src="https://raw.githubusercontent.com/scottstraughan/openssf-scorecard-dashboard/refs/heads/main/.github/images/run-button.png" width="250" />
</a>

The Open Source Security Dashboard can be used to inspect the OpenSSF scorecards for users/organizations or accounts 
stored on GitHub, GitLab or others.

![View the Dashboard](https://raw.githubusercontent.com/scottstraughan/openssf-scorecard-dashboard/refs/heads/main/.github/images/dashboard.jpg)

**The core features of the dashboard are:**

- Track multiple users/accounts/organizations
- Easily add a new organization or user to track
- Ability to provide GitHub/other API keys to avoid rate limiting (optional, stored locally)
- Track all the scorecards for each repository
- Cache system to ensure pages load quickly
- Ability to filter repositories by keywords
- Ability to sort repositories by scores, names etc
- Responsive design that will play nice on mobile
- Ability to view scorecards, issues and how to resolve them
- Written in a few days from scratch

## Tech Stack

![Angular][angular.io] ![Node.JS][node.js] ![SASS][sass]

## Running Locally

If you want to run your own version of this dashboard on your own machine, please fork/clone this repo, install
Angular-cli and then run with `ng serve`. You can build with `ng build`.

## Support

Contact <scotts@codpelay.com> if you need support or have questions.

[angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[node.js]: https://img.shields.io/badge/Nodejs-DD0031?style=for-the-badge&logo=angular&logoColor=white
[sass]: https://img.shields.io/badge/sass-DD0031?style=for-the-badge&logo=angular&logoColor=white
