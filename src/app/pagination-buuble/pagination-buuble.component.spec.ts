import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationBuubleComponent } from './pagination-buuble.component';

describe('PaginationBuubleComponent', () => {
  let component: PaginationBuubleComponent;
  let fixture: ComponentFixture<PaginationBuubleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PaginationBuubleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginationBuubleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
