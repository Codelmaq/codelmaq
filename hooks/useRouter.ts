import { useNavigate } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    prefetch: () => {},
    back: () => navigate(-1),
  };
}
