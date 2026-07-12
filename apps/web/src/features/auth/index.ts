/**
 * Public surface of the auth feature.
 * Pages import from here, never from sub-paths.
 */
export { AuthFormShell } from "./components/auth-form-shell";
export { LoginForm } from "./components/login-form";
export { LogoutButton } from "./components/logout-button";
export { SignupForm } from "./components/signup-form";

export { authApi, type AuthUser } from "./api/auth.api";
export { useCurrentUser } from "./hooks/use-current-user";
export { useLogin } from "./hooks/use-login";
export { useLogout } from "./hooks/use-logout";
export { useSignup } from "./hooks/use-signup";
