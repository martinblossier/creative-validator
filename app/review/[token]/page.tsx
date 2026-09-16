import { ReviewApp } from '@/components/review/ReviewApp';

export default function ReviewPage({ params }: { params: { token: string } }) {
  return <ReviewApp token={params.token} />;
}
