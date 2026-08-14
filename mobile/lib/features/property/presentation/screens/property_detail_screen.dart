import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/error/app_failure.dart';
import '../../../viewing/domain/entities/viewing.dart';
import '../../../viewing/presentation/providers/viewing_providers.dart';
import '../providers/property_providers.dart';
import '../../domain/repositories/property_repository.dart' show Success, Failure;

class PropertyDetailScreen extends ConsumerWidget {
  const PropertyDetailScreen({super.key, required this.propertyId});

  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final propertyAsync = ref.watch(propertyByIdProvider(propertyId));

    return Scaffold(
      appBar: AppBar(title: const Text('Property')),
      body: propertyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(error is AppFailure ? error.message : 'Something went wrong.'),
        ),
        data: (property) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(property.title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text('${property.addressLine}, ${property.city}, ${property.country}'),
                const SizedBox(height: 12),
                Text(
                  property.formattedPrice,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _StatIcon(icon: Icons.bed_outlined, label: '${property.bedrooms} bed'),
                    const SizedBox(width: 16),
                    _StatIcon(icon: Icons.bathtub_outlined, label: '${property.bathrooms} bath'),
                    if (property.areaSqm != null) ...[
                      const SizedBox(width: 16),
                      _StatIcon(icon: Icons.straighten, label: '${property.areaSqm} m²'),
                    ],
                  ],
                ),
                const SizedBox(height: 20),
                Text(property.description),
                const SizedBox(height: 28),
                if (property.status.name == 'published')
                  ElevatedButton.icon(
                    onPressed: () => _showBookingSheet(context, ref, property.id),
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: const Text('Book a viewing'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showBookingSheet(BuildContext context, WidgetRef ref, String propertyId) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _BookingSheet(propertyId: propertyId),
    );
  }
}

class _StatIcon extends StatelessWidget {
  const _StatIcon({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.outline),
        const SizedBox(width: 4),
        Text(label),
      ],
    );
  }
}

class _BookingSheet extends ConsumerStatefulWidget {
  const _BookingSheet({required this.propertyId});
  final String propertyId;

  @override
  ConsumerState<_BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends ConsumerState<_BookingSheet> {
  DateTime? _selectedDateTime;
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(now));
    if (time == null) return;

    setState(() {
      _selectedDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    final dateTime = _selectedDateTime;
    if (dateTime == null) return;

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    final repo = ref.read(viewingRepositoryProvider);
    final result = await repo.requestViewing(
      NewViewingInput(propertyId: widget.propertyId, scheduledAt: dateTime),
    );

    if (!mounted) return;

    switch (result) {
      case Success<Viewing>():
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Viewing requested — waiting on agent confirmation.')),
        );
      case Failure<Viewing>(:final failure):
        setState(() {
          _submitting = false;
          // A 409 here specifically means someone else booked that exact
          // slot first — the ACID-safe backend guarantees this is caught
          // even under concurrent requests. Message it distinctly so the
          // user understands to just pick a different time, not retry.
          _errorMessage = failure is ConflictFailure
              ? 'That slot was just booked by someone else. Please pick another time.'
              : failure.message;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Book a viewing', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _submitting ? null : _pickDateTime,
            icon: const Icon(Icons.schedule),
            label: Text(
              _selectedDateTime == null
                  ? 'Choose date & time'
                  : _selectedDateTime.toString().substring(0, 16),
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: (_selectedDateTime == null || _submitting) ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Request viewing'),
          ),
        ],
      ),
    );
  }
}
