import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectViewComponent } from './inspect-view.component';

describe('OrgViewComponent', () => {
  let component: InspectViewComponent;
  let fixture: ComponentFixture<InspectViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InspectViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
