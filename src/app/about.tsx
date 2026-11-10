import {
  Alert,
  KeyboardAvoidingView,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { localGovernmentAreas } from '@/lib/nigeria-lga-data';

const businessAreas = [
  'Construction materials',
  'Logistics and haulage',
  'Real estate',
  'Hospitality',
  'Financial services',
  'Agriculture',
  'Oil and gas',
  'Engineering services',
];

const values = ['Integrity', 'Customer focus', 'Operational excellence', 'Innovation', 'Responsibility'];

async function openContact(url: string, label: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(`${label} unavailable`, 'Please try again or contact Repton Group another way.');
  }
}

export default function AboutScreen() {
  const [branchFinderOpen, setBranchFinderOpen] = useState(false);
  const [branchStep, setBranchStep] = useState<'state' | 'lga' | 'result'>('state');
  const [selectedState, setSelectedState] = useState<keyof typeof localGovernmentAreas | null>(null);
  const [selectedLocalGovernment, setSelectedLocalGovernment] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const states = Object.keys(localGovernmentAreas) as (keyof typeof localGovernmentAreas)[];
  const localGovernments = selectedState ? localGovernmentAreas[selectedState] : [];
  const filteredLocations = (branchStep === 'state' ? states : localGovernments).filter((location) =>
    location.toLowerCase().includes(locationSearch.trim().toLowerCase()),
  );

  const openBranchFinder = () => {
    setBranchStep('state');
    setSelectedState(null);
    setSelectedLocalGovernment(null);
    setLocationSearch('');
    setBranchFinderOpen(true);
  };

  const selectState = (state: keyof typeof localGovernmentAreas) => {
    setSelectedState(state);
    setSelectedLocalGovernment(null);
    setLocationSearch('');
    setBranchStep('lga');
  };

  const selectLocalGovernment = (localGovernment: string) => {
    setSelectedLocalGovernment(localGovernment);
    setLocationSearch('');
    setBranchStep('result');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
            onPress={() => router.navigate('/')}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Image source={require('@/assets/images/repton-logo.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Repton Group" />
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Who we are</Text>
          <Text style={styles.title}>Building trust. Supporting progress.</Text>
          <Text style={styles.heroBody}>
            Repton Group is a Nigeria-based business group serving customers across construction materials and a range of essential industries.
          </Text>
          <View style={styles.heroRule} />
          <Text style={styles.heroFootnote}>Rooted in Nigeria. Focused on lasting value.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Our group</Text>
          <Text style={styles.sectionTitle}>One group, many ways to serve.</Text>
          <Text style={styles.body}>
            Our businesses span construction materials, logistics, property, hospitality, financial services, agriculture, oil and gas, and engineering. We bring these capabilities together to support customers, partners, and communities.
          </Text>
          <View style={styles.businessGrid}>
            {businessAreas.map((area) => (
              <View key={area} style={styles.businessChip}>
                <View style={styles.chipDot} />
                <Text style={styles.businessText}>{area}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.purposeCard}>
          <View style={styles.purposeBlock}>
            <Text style={styles.purposeEyebrow}>OUR MISSION</Text>
            <Text style={styles.purposeTitle}>Serve with trust and excellence.</Text>
            <Text style={styles.purposeBody}>
              Meet varied customer needs through our businesses and build lasting relationships grounded in trust and quality service.
            </Text>
          </View>
          <View style={styles.purposeDivider} />
          <View style={styles.purposeBlock}>
            <Text style={styles.purposeEyebrow}>OUR VISION</Text>
            <Text style={styles.purposeTitle}>Help improve quality of life.</Text>
            <Text style={styles.purposeBody}>
              Grow as a leading provider of essential needs across Nigeria, guided by hard work, integrity, and service to our communities.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>What guides us</Text>
          <Text style={styles.sectionTitle}>Values behind the work.</Text>
          <View style={styles.valuesList}>
            {values.map((value, index) => (
              <View key={value} style={styles.valueRow}>
                <Text style={styles.valueNumber}>0{index + 1}</Text>
                <Text style={styles.valueText}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.branchFinderCard}>
          <Text style={styles.branchEyebrow}>Across Nigeria</Text>
          <Text style={styles.branchTitle}>Find a Repton branch</Text>
          <Text style={styles.branchBody}>Choose your state and local government to see branch information for your area.</Text>
          <Pressable accessibilityRole="button" onPress={openBranchFinder} style={({ pressed }) => [styles.branchButton, pressed && styles.pressed]}>
            <Text style={styles.branchButtonText}>Find a branch</Text>
            <Text style={styles.branchButtonArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactEyebrow}>We’re here to help</Text>
          <Text style={styles.contactTitle}>Corporate head office</Text>
          <Text style={styles.contactBody}>Our corporate head office is in Ikeja, Lagos. This is the head office, separate from Repton Group’s branch network.</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Get directions to Repton Group’s head office"
            onPress={() => void openContact('https://maps.google.com/?q=144+Lola+Holloway,+Omole+Phase+1,+Ikeja,+Lagos+State', 'Directions')}
            style={({ pressed }) => [styles.addressAction, pressed && styles.pressed]}>
            <Text style={styles.address}>144 Lola Holloway, Omole Phase 1, Ikeja, Lagos State</Text>
            <Text style={styles.addressLink}>Get directions  ›</Text>
          </Pressable>
          <View style={styles.contactDetails}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Call Repton Group on +234 908 705 5512"
              onPress={() => void openContact('tel:+2349087055512', 'Phone call')}
              style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+234 908 705 5512</Text>
              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Email Repton Group at info@reptongroup.ng"
              onPress={() => void openContact('mailto:info@reptongroup.ng', 'Email')}
              style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@reptongroup.ng</Text>
              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/explore', params: { category: 'All', search: '' } })} style={styles.websiteAction}>
            <Text style={styles.websiteActionText}>Explore products  ›</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Repton Group · Nigeria</Text>
      </ScrollView>

      <Modal visible={branchFinderOpen} transparent animationType="slide" onRequestClose={() => setBranchFinderOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close branch finder" onPress={() => setBranchFinderOpen(false)} style={styles.modalBackdrop} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopRow}>
              {branchStep !== 'state' ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Go back one step" onPress={() => { setBranchStep(branchStep === 'result' ? 'lga' : 'state'); setLocationSearch(''); }} style={styles.modalBackButton}>
                  <Text style={styles.modalBackText}>‹</Text>
                </Pressable>
              ) : <View style={styles.modalBackSpacer} />}
              <Text style={styles.modalStepText}>{branchStep === 'state' ? 'Step 1 of 3' : branchStep === 'lga' ? 'Step 2 of 3' : 'Step 3 of 3'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close branch finder" onPress={() => setBranchFinderOpen(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.modalEyebrow}>Branch finder</Text>
            <Text style={styles.modalTitle}>{branchStep === 'state' ? 'Choose a state' : branchStep === 'lga' ? 'Choose a local government' : 'Branch information'}</Text>
            <Text style={styles.modalDescription}>
              {branchStep === 'state'
                ? 'Select where you need a Repton branch.'
                : branchStep === 'lga'
                  ? `Choose a local government in ${selectedState}.`
                  : `${selectedLocalGovernment}, ${selectedState}`}
            </Text>

            {branchStep !== 'result' ? (
              <>
                <View style={styles.locationSearchBox}>
                  <Text style={styles.locationSearchIcon}>⌕</Text>
                  <TextInput
                    accessibilityLabel={branchStep === 'state' ? 'Search states' : 'Search local governments'}
                    placeholder={branchStep === 'state' ? 'Search states' : 'Search local governments'}
                    placeholderTextColor="#74716F"
                    value={locationSearch}
                    onChangeText={setLocationSearch}
                    autoCapitalize="words"
                    style={styles.locationSearchInput}
                  />
                </View>
                <ScrollView style={styles.locationList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {filteredLocations.map((location) => (
                    <Pressable
                      key={location}
                      accessibilityRole="button"
                      onPress={() => branchStep === 'state' ? selectState(location as keyof typeof localGovernmentAreas) : selectLocalGovernment(location)}
                      style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}>
                      <Text style={styles.locationOption}>{location === 'Federal Capital Territory' ? 'Federal Capital Territory (FCT)' : location}</Text>
                      <Text style={styles.locationArrow}>›</Text>
                    </Pressable>
                  ))}
                  {filteredLocations.length === 0 ? <Text style={styles.noLocationResults}>No matches. Check the spelling and try again.</Text> : null}
                </ScrollView>
              </>
            ) : (
              <View style={styles.branchResultCard}>
                <View style={styles.branchPin}><Text style={styles.branchPinText}>⌖</Text></View>
                <Text style={styles.branchResultTitle}>Branch addresses are being verified</Text>
                <Text style={styles.branchResultBody}>We don’t have a verified branch address to show for this area yet. Contact Repton and the team can help you find the nearest location.</Text>
                <Pressable accessibilityRole="link" onPress={() => { setBranchFinderOpen(false); void openContact('tel:+2349087055512', 'Phone call'); }} style={({ pressed }) => [styles.branchContactButton, pressed && styles.pressed]}>
                  <Text style={styles.branchContactText}>Call Repton Group</Text>
                </Pressable>
                <Pressable accessibilityRole="link" onPress={() => { setBranchFinderOpen(false); void openContact('mailto:info@reptongroup.ng', 'Email'); }} style={({ pressed }) => [styles.branchContactButton, styles.branchEmailButton, pressed && styles.pressed]}>
                  <Text style={[styles.branchContactText, styles.branchEmailText]}>Email Repton Group</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => { setBranchStep('lga'); setSelectedLocalGovernment(null); }} style={styles.changeAreaButton}>
                  <Text style={styles.changeAreaText}>Choose another area</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.locationDataNote}>Location names: Open Admin Data · CC BY 4.0</Text>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F7' },
  page: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#171717', fontSize: 31, lineHeight: 35, marginTop: -3 },
  logo: { width: 132, height: 44 },
  headerSpacer: { width: 42 },
  hero: { marginTop: 14, padding: 22, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4', overflow: 'hidden' },
  eyebrow: { color: '#D71920', fontSize: 11, fontWeight: '700', letterSpacing: 0.55 },
  title: { maxWidth: 310, color: '#171717', fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.45, marginTop: 12 },
  heroBody: { color: '#74716F', fontSize: 14, lineHeight: 21, marginTop: 12 },
  heroRule: { height: 1, backgroundColor: '#EAE7E4', marginTop: 20 },
  heroFootnote: { color: '#74716F', fontSize: 12, fontWeight: '600', marginTop: 12 },
  section: { marginTop: 26 },
  sectionEyebrow: { color: '#D71920', fontSize: 11, fontWeight: '700', letterSpacing: 0.55 },
  sectionTitle: { color: '#171717', fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.25, marginTop: 5 },
  body: { color: '#74716F', fontSize: 14, lineHeight: 21, marginTop: 9 },
  businessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  businessChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D71920' },
  businessText: { color: '#303030', fontSize: 12, fontWeight: '500' },
  purposeCard: { marginTop: 25, paddingHorizontal: 18, paddingVertical: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  purposeBlock: { paddingVertical: 5 },
  purposeEyebrow: { color: '#D71920', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  purposeTitle: { color: '#171717', fontSize: 18, lineHeight: 24, fontWeight: '600', marginTop: 6 },
  purposeBody: { color: '#74716F', fontSize: 13, lineHeight: 20, marginTop: 6 },
  purposeDivider: { height: 1, backgroundColor: '#EAE7E4', marginVertical: 15 },
  valuesList: { marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: '#EAE7E4' },
  valueRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EAE7E4' },
  valueNumber: { width: 43, color: '#D71920', fontSize: 12, fontWeight: '600' },
  valueText: { color: '#222222', fontSize: 14, fontWeight: '500' },
  contactCard: { marginTop: 26, padding: 19, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  branchFinderCard: { marginTop: 26, padding: 19, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  branchEyebrow: { color: '#D71920', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  branchTitle: { color: '#171717', fontSize: 20, fontWeight: '600', marginTop: 6 },
  branchBody: { color: '#74716F', fontSize: 13, lineHeight: 20, marginTop: 7 },
  branchButton: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#D71920', marginTop: 15 },
  branchButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  branchButtonArrow: { color: '#FFFFFF', fontSize: 22, lineHeight: 25 },
  contactEyebrow: { color: '#D71920', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  contactTitle: { color: '#171717', fontSize: 22, fontWeight: '600', marginTop: 6 },
  contactBody: { color: '#74716F', fontSize: 13, lineHeight: 20, marginTop: 7 },
  addressAction: { marginTop: 13, alignSelf: 'flex-start' },
  address: { color: '#333333', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  addressLink: { color: '#D71920', fontSize: 12, fontWeight: '600', marginTop: 5 },
  contactDetails: { gap: 10, padding: 13, marginTop: 13, borderRadius: 12, backgroundColor: '#FAF9F7' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 28 },
  contactLabel: { color: '#74716F', fontSize: 11, fontWeight: '600' },
  contactValue: { flex: 1, color: '#222222', fontSize: 12, fontWeight: '500', textAlign: 'right' },
  contactArrow: { color: '#D71920', fontSize: 20, lineHeight: 24 },
  websiteAction: { minHeight: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#D71920', marginTop: 15 },
  websiteActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  footer: { color: '#74716F', fontSize: 11, textAlign: 'center', letterSpacing: 0.4, fontWeight: '500', marginTop: 24 },
  pressed: { opacity: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23,23,23,0.42)' },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  keyboardAvoidingView: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '92%', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FAF9F7' },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38 },
  modalBackSpacer: { width: 38 },
  modalBackButton: { width: 38, height: 38, alignItems: 'flex-start', justifyContent: 'center' },
  modalBackText: { color: '#D71920', fontSize: 29, lineHeight: 32 },
  modalStepText: { color: '#74716F', fontSize: 12, fontWeight: '500' },
  modalCloseButton: { width: 38, height: 38, alignItems: 'flex-end', justifyContent: 'center' },
  modalCloseText: { color: '#171717', fontSize: 28, lineHeight: 32 },
  modalEyebrow: { color: '#D71920', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 9 },
  modalTitle: { color: '#171717', fontSize: 24, lineHeight: 29, fontWeight: '700', marginTop: 4 },
  modalDescription: { color: '#74716F', fontSize: 13, lineHeight: 19, marginTop: 5 },
  locationSearchBox: { minHeight: 47, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginTop: 16, borderWidth: 1, borderColor: '#EAE7E4', borderRadius: 13, backgroundColor: '#FFFFFF' },
  locationSearchIcon: { color: '#D71920', fontSize: 22, marginRight: 8 },
  locationSearchInput: { flex: 1, minHeight: 45, color: '#171717', fontSize: 14 },
  locationList: { flexGrow: 0, maxHeight: 370, marginTop: 8 },
  locationRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EAE7E4' },
  locationOption: { color: '#171717', fontSize: 14, fontWeight: '500' },
  locationArrow: { color: '#D71920', fontSize: 22 },
  noLocationResults: { color: '#74716F', fontSize: 13, textAlign: 'center', padding: 20 },
  branchResultCard: { alignItems: 'center', padding: 18, marginTop: 18, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  branchPin: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#FFF5F3' },
  branchPinText: { color: '#D71920', fontSize: 27 },
  branchResultTitle: { color: '#171717', fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 13 },
  branchResultBody: { color: '#74716F', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  branchContactButton: { minHeight: 45, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 14, borderRadius: 12, backgroundColor: '#D71920' },
  branchContactText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  branchEmailButton: { marginTop: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  branchEmailText: { color: '#171717' },
  changeAreaButton: { minHeight: 41, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  changeAreaText: { color: '#D71920', fontSize: 12, fontWeight: '600' },
  locationDataNote: { color: '#8B8784', fontSize: 10, textAlign: 'center', marginTop: 12 },
});
