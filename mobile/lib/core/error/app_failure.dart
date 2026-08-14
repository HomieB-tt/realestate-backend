/// Shared, feature-agnostic failure type. Repository implementations
/// catch transport/API errors (Dio exceptions, Supabase auth errors) and
/// translate them into one of these, so presentation-layer code never
/// needs to know about Dio or Supabase exception types directly.
sealed class AppFailure {
  const AppFailure(this.message);
  final String message;
}

class NetworkFailure extends AppFailure {
  const NetworkFailure([super.message = 'Could not reach the server. Check your connection.']);
}

class UnauthorizedFailure extends AppFailure {
  const UnauthorizedFailure([super.message = 'Your session has expired. Please sign in again.']);
}

class ForbiddenFailure extends AppFailure {
  const ForbiddenFailure([super.message = 'You do not have permission to do that.']);
}

class NotFoundFailure extends AppFailure {
  const NotFoundFailure([super.message = 'Not found.']);
}

class ConflictFailure extends AppFailure {
  const ConflictFailure(super.message);
}

class ValidationFailure extends AppFailure {
  const ValidationFailure(super.message);
}

class UnknownFailure extends AppFailure {
  const UnknownFailure([super.message = 'Something went wrong. Please try again.']);
}
