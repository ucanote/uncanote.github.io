import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { GroupModel } from '../group/group.component';
import * as api from 'hypothesis-data'
import { Router } from '@angular/router';
import { ConfigService } from '../setting/config.service';
import { MenuItem } from 'primeng/api';
import { deleteGroup } from 'hypothesis-data';
import { ConfirmationService } from 'primeng/api';
import { ExtensionService } from '../fragment/extension.service';
import { HeaderObserverService } from '../header/header-observer.service';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss', '../style/list.scss']
})
export class GroupListComponent implements OnInit, OnDestroy {

  model: GroupListModel = { groups: [] };
  keyword: string = '';
  subscriptions: Subscription[] = [];
  constructor(private config: ConfigService, private router: Router, private extensionService: ExtensionService, private headerService: HeaderObserverService) {
    this.keyword = this.headerService.searchInputControl.value; // TODO
    let s = this.headerService.searchInputControl.valueChanges.subscribe((keyword) => {
      this.keyword = keyword;
      this.applyKeywordToGroupList();
    });
    this.subscriptions.push(s);
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());

  }

  private async getItemCount(groupModel: GroupModel) {
    interface ItemCountObject {
      itemCount: number;
      date: Date;
    }
    let countCacheString = localStorage.getItem(groupModel.id);
    if (countCacheString && Math.abs((new Date(JSON.parse(countCacheString).date).getTime() - Date.now()) / (1000 * 60)) > 30) {
      countCacheString = null;
    }
    let itemCountObject: ItemCountObject | null = countCacheString ? JSON.parse(countCacheString) : null;
    if (!itemCountObject) {
      // Get the count of items from Hypothesis 
      const annotations = await api.getAnnotations(this.config.key, groupModel.id, 0);
      itemCountObject = { itemCount: annotations.total, date: new Date() };
    }

    localStorage.setItem(groupModel.id, JSON.stringify(itemCountObject));
    return itemCountObject.itemCount;
  }

  private async loadGroups() {
    const groups = await api.getGroups(this.config.key);
    this.model = { groups: groups.map(g => ({ ...g })) };
    for (let group of this.model.groups) {
      group.itemCount = await this.getItemCount(group);
    }
    this.applyKeywordToGroupList();
    this.onGroupListUpdate();
  }

  onGroupClick(model: GroupModel) {
    this.router.navigate(['groups', model.id]);
  }

  async onGroupDeleteClick(model: GroupModel) {
    await deleteGroup(this.config.key, model.id);
    this.model.groups = this.model.groups.filter(m => m.id != model.id);
    this.applyKeywordToGroupList();
    this.onGroupListUpdate();
  }

  private applyKeywordToGroupList() {
    this.model.groups.forEach(g => {
      if (g.name.toLocaleLowerCase().includes(this.keyword.toLocaleLowerCase())) {
        g.disabled = false;
      } else {
        g.disabled = true;
      }
    });
  }

  onGroupListUpdate() {
    //TODO
    this.extensionService.updateContextMenu(this.model);
  }
}

export interface GroupListModel {
  groups: GroupModel[];
}

interface ItemCountCache {
  date: Date,
  data: { [id: string]: number };
}