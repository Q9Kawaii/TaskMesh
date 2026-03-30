import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  // Use static: false so they are re-queried if the DOM changes (like showSignup)
  @ViewChild('email') emailInput!: ElementRef;
  @ViewChild('password') passwordInput!: ElementRef;

  loading = false;
  showSignup = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleView() {
    this.showSignup = !this.showSignup;
    this.errorMessage = null;
    this.loading = false; // Reset loading just in case
  }

  async login(emailVal: string, passwordVal: string) {
    if (this.loading) return;
    
    this.errorMessage = null;

    if (!emailVal || !passwordVal) {
      this.errorMessage = "Please enter email and password";
      return;
    }

    this.loading = true;

    try {
      const user: User = await this.authService.login(emailVal, passwordVal);
      // Success - Navigate away
      this.router.navigate([`/${user.role}`]);
    } catch (error: any) {
      // ✅ Handle Error UI
      if (error.message === "User not found") {
        this.errorMessage = "Account not found. Click 'Request Access' below.";
      } else {
        this.errorMessage = "Invalid credentials. Please try again.";
      }

      // ✅ Reset UI State
      this.loading = false; 

      // ✅ Clear DOM Inputs
      if (this.emailInput && this.passwordInput) {
        this.emailInput.nativeElement.value = '';
        this.passwordInput.nativeElement.value = '';
        this.emailInput.nativeElement.focus();
      }
    } finally {
      // Safety net to ensure button always unlocks
      this.loading = false;
    }
  }

  async signup(name: string, phone: string, email: string, password: string) {
    if (this.loading) return;
    this.errorMessage = null;
    this.loading = true;

    try {
      await this.authService.signup(name, phone, email, password);
      this.errorMessage = "Success! Please verify your email.";
      this.showSignup = false;
    } catch (error: any) {
      this.errorMessage = error.message || "Signup failed";
    } finally {
      this.loading = false;
    }
  }
}