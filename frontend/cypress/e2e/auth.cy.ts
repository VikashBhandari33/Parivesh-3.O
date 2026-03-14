describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear state before each test
    cy.window().then((win) => win.localStorage.clear());
  });

  it('should display the login page correctly', () => {
    cy.visit('/login');
    cy.contains('Sign In').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('should show an error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    cy.contains(/Invalid email or password|Too many auth attempts/i, { timeout: 10000 }).should('be.visible');
  });

  it('should successfully login as a proponent and redirect to dashboard', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('proponent@example.com');
    cy.get('input[type="password"]').type('Proponent@1234');
    cy.get('button[type="submit"]').click();
    
    // Check if redirect to dashboard occurred
    cy.url().should('include', '/dashboard/proponent');
    cy.contains('My Applications').should('be.visible');
    cy.contains('Amit Singh').should('be.visible'); // Name from DB seed
  });
});
