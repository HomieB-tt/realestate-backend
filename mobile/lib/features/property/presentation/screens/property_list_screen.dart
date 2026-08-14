import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/app_failure.dart';
import '../../domain/repositories/property_repository.dart';
import '../providers/property_providers.dart';
import '../widgets/property_card.dart';
import 'property_detail_screen.dart';

/// Landing screen for clients: search nearby published listings.
/// Defaults to a fixed demo location on first load so the screen isn't
/// empty before the user grants location permission / picks a spot —
/// swap `_defaultSearch` for a real device-location lookup (e.g. the
/// `geolocator` package) once that's wired in.
class PropertyListScreen extends ConsumerStatefulWidget {
  const PropertyListScreen({super.key});

  @override
  ConsumerState<PropertyListScreen> createState() => _PropertyListScreenState();
}

class _PropertyListScreenState extends ConsumerState<PropertyListScreen> {
  static const _defaultSearch = RadiusSearchParams(
    lng: 32.5825,
    lat: 0.3476,
    radiusMeters: 10000,
  );

  @override
  void initState() {
    super.initState();
    // Defer until after first frame so ref.read is safe inside initState.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(searchParamsProvider.notifier).state = _defaultSearch;
    });
  }

  @override
  Widget build(BuildContext context) {
    final propertiesAsync = ref.watch(nearbyPropertiesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Nearby listings')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(nearbyPropertiesProvider.future),
        child: propertiesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorView(
            failure: error is AppFailure ? error : const UnknownFailure(),
            onRetry: () => ref.invalidate(nearbyPropertiesProvider),
          ),
          data: (properties) {
            if (properties.isEmpty) {
              return LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: SizedBox(
                    height: constraints.maxHeight,
                    child: const Center(child: Text('No listings found nearby yet.')),
                  ),
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: properties.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final property = properties[index];
                return PropertyCard(
                  property: property,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => PropertyDetailScreen(propertyId: property.id)),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.failure, required this.onRetry});
  final AppFailure failure;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 40, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(failure.message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
