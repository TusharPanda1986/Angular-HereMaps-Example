import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pagination-buuble',
  templateUrl: './pagination-buuble.component.html',
  styleUrls: ['./pagination-buuble.component.scss']
})
export class PaginationBuubleComponent implements OnInit {
  config: any;
  collection: any = {};
  parameters: string[] = [];

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.parameters = params.param;
      let parameter = params.param;
      parameter = parameter.substring(1);
      parameter = parameter.slice(0, -1);
      this.parameters = parameter.split(',');
    });

    this.collection.count = this.parameters.length;
    this.collection.data = [];
    for (let i = 0; i < this.collection.count; i++) {
      this.collection.data.push(
        {
          id: i + 1,
          value: this.parameters[i]
        }
      );
    }

    this.config = {
      itemsPerPage: 1,
      currentPage: 1,
      totalItems: this.collection.count
    };
  }

  pageChanged(event: any): void {
    this.config.currentPage = event;
  }
}
