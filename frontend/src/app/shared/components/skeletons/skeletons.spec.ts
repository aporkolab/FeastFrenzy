import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableSkeletonComponent } from './table-skeleton.component';
import { CardSkeletonComponent } from './card-skeleton.component';
import { FormSkeletonComponent } from './form-skeleton.component';

describe('TableSkeletonComponent', () => {
  let component: TableSkeletonComponent;
  let fixture: ComponentFixture<TableSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TableSkeletonComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default rows of 5', () => {
    expect(component.rows).toBe(5);
    expect(component.rowArray.length).toBe(5);
  });

  it('should have default columns of 4', () => {
    expect(component.columns).toBe(4);
    expect(component.columnArray.length).toBe(4);
  });

  it('should respect custom rows input', () => {
    component.rows = 10;
    expect(component.rowArray.length).toBe(10);
  });

  it('should respect custom columns input', () => {
    component.columns = 6;
    expect(component.columnArray.length).toBe(6);
  });

  it('should return custom column width when provided', () => {
    component.columnWidths = ['100px', '200px', 'auto'];
    expect(component.getColumnWidth(0)).toBe('100px');
    expect(component.getColumnWidth(1)).toBe('200px');
    expect(component.getColumnWidth(2)).toBe('auto');
    expect(component.getColumnWidth(3)).toBe('auto'); // Falls back to auto
  });

  it('should render skeleton rows', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(5);
  });

  it('should have accessible role', () => {
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('.skeleton-table');
    expect(table.getAttribute('role')).toBe('status');
    expect(table.getAttribute('aria-label')).toBe('Loading table data');
  });
});

describe('CardSkeletonComponent', () => {
  let component: CardSkeletonComponent;
  let fixture: ComponentFixture<CardSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardSkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardSkeletonComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show image by default', () => {
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.skeleton-image');
    expect(image).toBeTruthy();
  });

  it('should hide image when showImage is false', () => {
    component.showImage = false;
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.skeleton-image');
    expect(image).toBeFalsy();
  });

  it('should show subtitle when showSubtitle is true', () => {
    component.showSubtitle = true;
    fixture.detectChanges();
    const subtitle = fixture.nativeElement.querySelector('.skeleton-subtitle');
    expect(subtitle).toBeTruthy();
  });

  it('should render correct number of text lines', () => {
    component.textLines = 4;
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.skeleton-text');
    expect(lines.length).toBe(4);
  });

  it('should show action when showAction is true', () => {
    component.showAction = true;
    fixture.detectChanges();
    const action = fixture.nativeElement.querySelector('.skeleton-action');
    expect(action).toBeTruthy();
  });

  it('should apply horizontal class when horizontal is true', () => {
    component.horizontal = true;
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.skeleton-card');
    expect(card.classList.contains('skeleton-horizontal')).toBe(true);
  });
});

describe('FormSkeletonComponent', () => {
  let component: FormSkeletonComponent;
  let fixture: ComponentFixture<FormSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FormSkeletonComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default fields of 4', () => {
    expect(component.fields).toBe(4);
    expect(component.fieldArray.length).toBe(4);
  });

  it('should render correct number of fields', () => {
    component.fields = 6;
    fixture.detectChanges();
    const fields = fixture.nativeElement.querySelectorAll('.skeleton-field');
    expect(fields.length).toBe(6);
  });

  it('should show title by default', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.skeleton-form-title');
    expect(title).toBeTruthy();
  });

  it('should hide title when showTitle is false', () => {
    component.showTitle = false;
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.skeleton-form-title');
    expect(title).toBeFalsy();
  });

  it('should show actions by default', () => {
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('.skeleton-actions');
    expect(actions).toBeTruthy();
  });

  it('should hide actions when showActions is false', () => {
    component.showActions = false;
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('.skeleton-actions');
    expect(actions).toBeFalsy();
  });

  it('should show textarea on last field when showTextarea is true', () => {
    component.showTextarea = true;
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('.skeleton-input');
    const lastInput = inputs[inputs.length - 1];
    expect(lastInput.classList.contains('skeleton-textarea')).toBe(true);
  });
});
