// src/components/parks/ParkForm.tsx
import React, { useState } from 'react';
import { Park } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface ParkFormProps {
    initialData?: Partial<Park>;
    onSubmit: (data: Omit<Park, 'parkId'>) => Promise<void>;
    isEditing?: boolean;
}

export const ParkForm: React.FC<ParkFormProps> = ({
    initialData = {},
    onSubmit,
    isEditing = false
}) => {
    const [formData, setFormData] = useState<Partial<Park>>({
        name: '',
        county: '',
        email: '',
        minLatitude: '',
        maxLatitude: '',
        minLongitude: '',
        maxLongitude: '',
        isActive: true,
        ...initialData
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (!formData.name || formData.name.trim() === '') {
                throw new Error('Park name is required');
            }

            if (!formData.county || formData.county.trim() === '') {
                throw new Error('County is required');
            }

            if (formData.minLatitude === '' || formData.maxLatitude === '' ||
				formData.minLongitude === '' || formData.maxLongitude === ''
            ) {
                throw new Error('Latitude and Longitude are required');
            }

            if (!formData.minLatitude || formData.minLatitude < -90 || formData.minLatitude > 90 ||
				!formData.maxLatitude || formData.maxLatitude < -90 || formData.maxLatitude > 90
            ) {
                throw new Error('Latitude must be between -90 and 90');
            }

            if (!formData.minLongitude || formData.minLongitude < -180 || formData.minLongitude > 180 ||
				!formData.maxLongitude || formData.maxLongitude < -180 || formData.maxLongitude > 180
            ) {
                throw new Error('Longitude must be between -180 and 180');
            }

            const email = formData.email?.trim() ?? '';
            if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            //  We would later upload the image to a server here and get back a URL to store with the park
            const cleanedData = {
                ...formData,
                email: email === '' ? null : email,
                minLatitude: Number(formData.minLatitude),
                maxLatitude: Number(formData.maxLatitude),
                minLongitude: Number(formData.minLongitude),
                maxLongitude: Number(formData.maxLongitude),
            };
            await onSubmit(cleanedData as Omit<Park, 'parkId'>);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred while saving the park.');
            }
            // eslint-disable-next-line no-console
            console.error('Error submitting park form:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <Alert variant="danger" className="mb-4" onDismiss={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Park Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        label="Park Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <Input
                        label="County"
                        name="county"
                        value={formData.county}
                        onChange={handleChange}
                        required
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 mb-6">
                    <Input
                        label="Contact Email"
                        name="email"
                        type="email"
                        value={formData.email ?? ''}
                        onChange={handleChange}
                        placeholder="Notified when a new issue is reported (optional)"
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        label="Mininimum Latitude"
                        name="minLatitude"
                        value={formData.minLatitude}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <Input
                        label="Maximum Latitude"
                        name="maxLatitude"
                        value={formData.maxLatitude}
                        onChange={handleChange}
                        required
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        label="Minimum Longitude"
                        name="minLongitude"
                        value={formData.minLongitude}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <Input
                        label="Maximum Longitude"
                        name="maxLongitude"
                        value={formData.maxLongitude}
                        onChange={handleChange}
                        required
                        fullWidth
                    />
                </div>

                <div className="flex items-center">
                    <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-3 block text-sm text-gray-700">
                        Park is active and open to visitors
                    </label>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                >
                    {isEditing ? 'Update Park' : 'Create Park'}
                </Button>
            </div>
        </form>
    );
};
