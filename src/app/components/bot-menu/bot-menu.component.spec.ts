import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotMenuComponent } from './bot-menu.component';

describe('BotMenuComponent', () => {
  let component: BotMenuComponent;
  let fixture: ComponentFixture<BotMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BotMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
