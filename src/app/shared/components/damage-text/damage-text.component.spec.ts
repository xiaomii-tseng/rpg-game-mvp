import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DamageTextComponent } from './damage-text.component';

describe('DamageTextComponent', () => {
  let component: DamageTextComponent;
  let fixture: ComponentFixture<DamageTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DamageTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DamageTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
