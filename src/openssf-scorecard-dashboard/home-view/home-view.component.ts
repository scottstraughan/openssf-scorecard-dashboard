/*---------------------------------------------------------------------------------------------
 *
 *  Copyright (C) Codeplay Software Ltd.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *--------------------------------------------------------------------------------------------*/

import { ChangeDetectionStrategy, Component, OnInit, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { LinkButtonComponent } from '../shared/components/link-button/link-button.component';
import { FollowAccountPopupComponent } from '../popups/follow-account-popup/follow-account-popup.component';
import { PopupService } from '../shared/components/popup/popup.service';
import { take, tap } from 'rxjs';
import { AccountService } from '../shared/services/providers/account.service';
import { AccountModel } from '../shared/models/account.model';

@Component({
  selector: 'ossfd-home-view',
  standalone: true,
  templateUrl: 'home-view.component.html',
  styleUrls: ['./home-view.component.scss'],
  imports: [
    RouterLink,
    LinkButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeViewComponent implements OnInit {
  /**
   * Example ideas.
   * @protected
   */
  protected ideas: Signal<Idea[]> = signal([
    {
      name: 'Angular',
      description: 'Angular is a TypeScript-based free and open-source single-page web application framework.',
      url: '/github/angular',
      avatar: 'https://avatars.githubusercontent.com/u/139426?s=200&v=4',
    },
    {
      name: 'Codeplay® Software',
      description: 'Codeplay is internationally recognized for expertise in Heterogeneous Systems.',
      url: '/github/codeplaysoftware',
      avatar: 'https://avatars.githubusercontent.com/u/7440916?s=200&v=4',
    },
    {
      name: 'Intel®',
      description: 'Speed up AI development using Intel®-optimized software &amp; hardware.',
      url: '/github/intel',
      avatar: 'https://avatars.githubusercontent.com/u/17888862?s=200&v=4',
    },
    {
      name: 'JetBrains®',
      description: 'At JetBrains we create, contribute, and support Open Source projects.',
      url: '/github/jetbrains',
      avatar: 'https://avatars.githubusercontent.com/u/878437?s=200&v=4',
    },
    {
      name: 'Ladybird',
      description: 'Ladybird is an open-source web browser developed by the Ladybird Browser Initiative.',
      url: '/github/LadybirdBrowser',
      avatar: 'https://avatars.githubusercontent.com/u/134672918?s=200&v=4',
    },
    {
      name: 'Microsoft®',
      description: 'Open source projects and samples from Microsoft Corporation.',
      url: '/github/microsoft',
      avatar: 'https://avatars.githubusercontent.com/u/6154722?s=200&v=4',
    },
    {
      name: 'Scott Straughan',
      description: 'Full stack software engineer. Love working with Angular, Android and AWS.',
      url: '/github/scottstraughan',
      avatar: 'https://avatars.githubusercontent.com/u/42965777?v=4',
    },
    {
      name: 'Signal',
      description: 'Say "hello" to a different messaging experience.',
      url: '/github/signalapp',
      avatar: 'https://avatars.githubusercontent.com/u/702459?s=200&v=4',
    },
    {
      name: 'UXL Foundation',
      description: 'UXL promotes open source & standards for accelerated computing.',
      url: '/github/uxlfoundation',
      avatar: 'https://avatars.githubusercontent.com/u/144704571?v=4',
    },
  ])

  /**
   * Constructor.
   */
  constructor(
    private popupService: PopupService,
    private activatedRoute: ActivatedRoute,
    private accountService: AccountService,
    private router: Router,
    title: Title
  ) {
    title.setTitle('Who to Follow - OpenSSF Scorecard Dashboard');
  }

  /**
   * @inheritdoc
   */
  ngOnInit() {
    this.activatedRoute.url
      .pipe(
        tap(urlSegments => {
          if (urlSegments.length == 0) {
            this.accountService.observeAccounts()
              .pipe(
                tap(accounts =>
                  accounts.length > 0 && this.redirectToFirstAccount(accounts)),
                take(1)
              )
              .subscribe();
          }
        })
      )
      .subscribe()
  }

  /**
   * Called when a user presses the follow button.
   */
  onFollowAccount() {
    this.popupService.create(FollowAccountPopupComponent, null, true);
  }

  /**
   * Redirect a user to the first account.
   * @param accounts
   * @private
   */
  private redirectToFirstAccount(
    accounts: AccountModel[]
  ) {
    if (accounts.length > 0) {
      const firstAccount = accounts[0];

      this.router.navigate(
        [`/${firstAccount.service}/${firstAccount.tag}`], { relativeTo: this.activatedRoute, replaceUrl: true })
        .then();
    }
  }
}

/**
 * Idea model.
 */
interface Idea {
  name: string
  description: string
  url: string
  avatar: string
}