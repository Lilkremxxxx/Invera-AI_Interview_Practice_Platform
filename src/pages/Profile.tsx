import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Upload, 
  Target,
  Briefcase,
  Save
} from 'lucide-react';
import { roles } from '@/lib/mock-data';

const Profile = () => {
  const [name, setName] = useState('Nguyễn Văn A');
  const [email, setEmail] = useState('nguyen@example.com');
  const [targetRole, setTargetRole] = useState('frontend');
  const [careerGoal, setCareerGoal] = useState('Đang tìm cách chuyển sang vị trí lập trình viên frontend senior tại một công ty công nghệ hàng đầu trong vòng một năm tới.');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Hồ sơ</h1>
        <p className="text-muted-foreground">Quản lý hồ sơ và mục tiêu nghề nghiệp của bạn</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl gradient-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-foreground">NA</span>
            </div>
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              Tải ảnh lên
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Career Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Mục tiêu nghề nghiệp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Vị trí mục tiêu</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roles.slice(0, 6).map((role) => (
                <button
                  key={role.id}
                  onClick={() => setTargetRole(role.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    targetRole === role.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <span className="text-lg mr-2">{role.icon}</span>
                  <span className="text-sm font-medium">{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Mô tả mục tiêu nghề nghiệp</Label>
            <Textarea
              id="goal"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Mô tả mục tiêu nghề nghiệp và những gì bạn muốn đạt được..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* CV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Sơ yếu lý lịch / CV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium text-foreground mb-2">Tải lên sơ yếu lý lịch của bạn</h4>
            <p className="text-sm text-muted-foreground mb-4">
              PDF, DOC hoặc DOCX tối đa 10MB
            </p>
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              Chọn tệp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg">
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
};

export default Profile;
